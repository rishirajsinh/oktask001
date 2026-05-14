const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  testId: {
    type: String,
    required: true,
  },
  answers: {
    type: Object, // Will store { questionId: "selected option" }
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  percentage: {
    type: String,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
