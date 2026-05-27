require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const Student = require('./models/Student');
const Token = require('./models/Token');
const Submission = require('./models/Submission');

const app = express();

const fs = require('fs');
const path = require('path');

// Test configuration: maps testId to question file and timer
const testConfig = {
  PYTHON_HARD: {
    file: 'questions_python_hard.json',
    timeLimit: 1200 // 20 minutes
  },
  PYTHON_EASY: {
    file: 'questions_python_easy.json',
    timeLimit: 1200 // 20 minutes
  },
  MATHS: {
    file: 'questions_maths.json',
    timeLimit: 1500 // 25 minutes
  }
};

// Load all question sets
const questionSets = {};

for (const [testId, config] of Object.entries(testConfig)) {
  try {
    const questionsPath = path.join(__dirname, config.file);
    const rawData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

    questionSets[testId] = rawData.map((q, index) => ({
      id: q.id || (index + 1),
      text: q.text || q.question || "Untitled Question",
      options: q.options || [],
      answer: q.answer || ""
    }));

    console.log(`Loaded ${questionSets[testId].length} questions for ${testId}.`);
  } catch (err) {
    console.error(`Failed to load ${config.file}`, err);
    questionSets[testId] = [];
  }
}

// Middleware
app.use(cors()); // In production, you can restrict this to your Netlify URL
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codeanantam')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Admin Routes

// 1. Add student manually (Admin only)
app.post('/admin/add-student', async (req, res) => {
  try {
    const { email, testId } = req.body;
    
    if (!email || !testId) {
      return res.status(400).json({ error: 'Email and testId are required' });
    }

    // Validate testId
    if (!testConfig[testId]) {
      return res.status(400).json({ error: 'Invalid test type. Valid options: PYTHON_HARD, PYTHON_EASY, MATHS' });
    }

    // Check if student already exists
    let student = await Student.findOne({ email, testId });
    if (student) {
      return res.status(400).json({ error: 'Student already added' });
    }

    // Create student (Status defaults to paid since admin added them)
    student = new Student({ email, testId, status: 'paid' });
    await student.save();

    // Generate unique token immediately
    const tokenStr = uuidv4();
    const tokenDoc = new Token({ email, testId, token: tokenStr });
    await tokenDoc.save();

    res.status(201).json({ 
      message: 'Student added and token generated', 
      token: tokenStr 
    });
  } catch (error) {
    console.error('Admin add error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Get all admin data (Dashboard)
app.get('/admin/data', async (req, res) => {
  try {
    const students = await Student.find().lean();
    const tokens = await Token.find().lean();
    const submissions = await Submission.find().lean();

    // Merge data for the frontend
    const report = students.map(s => {
      const token = tokens.find(t => t.email === s.email && t.testId === s.testId);
      const submission = submissions.find(sub => sub.email === s.email && sub.testId === s.testId);
      
      return {
        ...s,
        token: token ? token.token : null,
        score: submission ? submission.score : null,
        totalQuestions: submission ? submission.totalQuestions : null,
        percentage: submission ? submission.percentage : null,
        submittedAt: submission ? submission.submittedAt : null
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Delete student and related data
app.delete('/admin/student/:email', async (req, res) => {
  try {
    const { email } = req.params;
    await Student.deleteMany({ email });
    await Token.deleteMany({ email });
    await Submission.deleteMany({ email });
    res.json({ message: 'Student data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Student Routes

// 1. Token verification
app.get('/verify-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) {
      return res.json({ access: false });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({ 
      email: tokenDoc.email, 
      testId: tokenDoc.testId 
    });

    res.json({ 
      access: true, 
      email: tokenDoc.email,
      alreadySubmitted: !!existingSubmission 
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Test data fetch — returns questions + timeLimit based on testId
app.get('/test/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const testId = tokenDoc.testId;
    const questions = questionSets[testId] || [];
    const timeLimit = testConfig[testId] ? testConfig[testId].timeLimit : 1200;

    // Return test questions + timer (NO test type name sent to student)
    res.json({
      testId: testId,
      questions: questions,
      timeLimit: timeLimit
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Submit Test — scores against the correct question set
app.post('/submit-test', async (req, res) => {
  try {
    const { token, answers } = req.body;

    if (!token || !answers) {
      return res.status(400).json({ error: 'Token and answers are required' });
    }

    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const existingSubmission = await Submission.findOne({ email: tokenDoc.email, testId: tokenDoc.testId });
    if (existingSubmission) {
      return res.status(400).json({ error: 'Test already submitted' });
    }

    const testId = tokenDoc.testId;
    const questions = questionSets[testId] || [];

    let score = 0;
    const totalQuestions = questions.length;
    
    questions.forEach(q => {
      if (answers[q.id] === q.answer) {
        score++;
      }
    });
    
    const percentage = ((score / totalQuestions) * 100).toFixed(2) + '%';

    const submission = new Submission({
      email: tokenDoc.email,
      testId: tokenDoc.testId,
      answers: answers,
      score: score,
      totalQuestions: totalQuestions,
      percentage: percentage
    });
    
    await submission.save();

    res.json({ message: 'Test submitted successfully!' });

  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
