import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const TestPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [testData, setTestData] = useState(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [proctoring, setProctoring] = useState({ camera: false, mic: false, location: false });

  const [timeLeft, setTimeLeft] = useState(null); // Will be set from backend
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Timer Logic
  useEffect(() => {
    if (!testStarted || submitted || timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, submitted, timeLeft]);

  const handleAutoSubmit = async () => {
    const finalAnswers = { ...selectedAnswers };
    if (testData?.questions) {
      testData.questions.forEach(q => {
        if (!finalAnswers[q.id]) {
          finalAnswers[q.id] = q.options[0];
        }
      });
    }

    try {
      await axios.post(`${backendUrl}/submit-test`, {
        token: token,
        answers: finalAnswers
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Auto-submit error:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const verifyTokenAndFetchTest = async () => {
      try {
        const verifyRes = await axios.get(`${backendUrl}/verify-token/${token}`);
        
        if (!verifyRes.data.access) {
          navigate('/access-denied');
          return;
        }

        if (verifyRes.data.alreadySubmitted) {
          setSubmitted(true);
        }

        setStudentEmail(verifyRes.data.email);
        const testRes = await axios.get(`${backendUrl}/test/${token}`);
        setTestData(testRes.data);
        // Set timer from backend response
        if (testRes.data.timeLimit) {
          setTimeLeft(testRes.data.timeLimit);
        } else {
          setTimeLeft(1200); // fallback 20 min
        }
      } catch (error) {
        console.error('Error validating access:', error);
        navigate('/access-denied');
      } finally {
        setLoading(false);
      }
    };
    verifyTokenAndFetchTest();
  }, [token, navigate, backendUrl]);

  const [stream, setStream] = useState(null);

  useEffect(() => {
    if (testStarted && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [testStarted, stream]);

  const requestPermissions = async () => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(userStream);
      setProctoring(prev => ({ ...prev, camera: true, mic: true }));

      navigator.geolocation.getCurrentPosition(() => {
        setProctoring(prev => ({ ...prev, location: true }));
      }, (err) => console.log("Location denied"));

      setTestStarted(true);
    } catch (err) {
      alert("Please allow Camera and Mic permissions to start the test.");
      console.error("Permission error:", err);
    }
  };

  const handleSelectOption = (questionId, option) => {
    setSelectedAnswers({ ...selectedAnswers, [questionId]: option });
  };

  const handleSubmit = async () => {
    try {
      await axios.post(`${backendUrl}/submit-test`, {
        token: token,
        answers: selectedAnswers
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Failed to submit test.');
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Verifying secure access...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="instruction-wrapper">
        <div className="glass-container instruction-card" style={{ textAlign: 'center' }}>
          <div className="success-icon" style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h1 className="success-text">Test Completed</h1>
          <p>Thank you, <strong>{studentEmail}</strong>.</p>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
            Your assessment has been successfully recorded. You may now close this tab.
          </p>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="instruction-wrapper">
        <div className="glass-container instruction-card">
          <header className="instruction-header">
            <h1>CodeAnantam Admission Test</h1>
            <p>Welcome, <strong>{studentEmail}</strong></p>
          </header>

          <div className="instruction-body">
            <h3>Before you begin:</h3>
            <ul>
              <li><strong>All questions are compulsory.</strong> You must answer every question to submit.</li>
              <li>There is <strong>no negative marking</strong> for incorrect answers.</li>
              <li>Ensure you are in a well-lit and quiet environment.</li>
              <li>Your Camera, Microphone, and Location must remain active.</li>
              <li>Do not refresh the page or switch tabs during the test.</li>
            </ul>

            <div className="permission-check-box">
              <div className="permission-item">
                <span className="icon">📸</span>
                <div className="text">
                  <h4>Camera & Mic Access</h4>
                  <p>Required for live identity verification.</p>
                </div>
              </div>
              <div className="permission-item">
                <span className="icon">📍</span>
                <div className="text">
                  <h4>Location Access</h4>
                  <p>Required to verify your testing region.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="instruction-footer">
            <button className="btn-primary start-btn" onClick={requestPermissions}>
              Enable Permissions & Start Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="test-layout">
      <div className="proctor-sidebar">
        <div className="camera-preview">
          <video ref={videoRef} autoPlay playsInline muted />
          <div className="recording-indicator">
            <span className="dot"></span> LIVE PROCTORING
          </div>
        </div>
        <div className="proctor-status">
          <div className={`status-item ${proctoring.camera ? 'active' : ''}`}>
            📹 Camera: {proctoring.camera ? 'Active' : 'Wait...'}
          </div>
          <div className={`status-item ${proctoring.mic ? 'active' : ''}`}>
            🎤 Mic: {proctoring.mic ? 'Active' : 'Wait...'}
          </div>
          <div className={`status-item ${proctoring.location ? 'active' : ''}`}>
            📍 Location: {proctoring.location ? 'Verified' : 'Wait...'}
          </div>
        </div>
      </div>

      <div className="glass-container test-main">
        <div className="header">
          <div>
            <h2 className="brand-title">CodeAnantam Admission Test</h2>
            <p className="status-sub">Secure Environment Active</p>
          </div>
          <div className="header-right">
            <div className={`timer-badge ${timeLeft < 300 ? 'low-time' : ''}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
            <div className="badge student-badge">{studentEmail}</div>
          </div>
        </div>

        <div className="test-content">
          {testData?.questions.map((q, index) => (
            <div key={q.id} className="question-card" style={{ animationDelay: `${index * 0.1}s` }}>
              <h3 className="question-text">{index + 1}. {q.text}</h3>
              <div className="options-grid">
                {q.options.map((option, optIdx) => (
                  <button
                    key={optIdx}
                    className={`option-btn ${selectedAnswers[q.id] === option ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(q.id, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="test-footer">
          <div className="footer-status">
            {Object.keys(selectedAnswers).length < (testData?.questions.length || 0) ? (
              <p className="warning-text mandatory-msg">
                ⚠️ {testData?.questions.length - Object.keys(selectedAnswers).length} questions remaining. All questions are compulsory.
              </p>
            ) : (
              <p className="success-text-simple">✅ All questions answered. You can now submit.</p>
            )}
            <p className="info-text small">Note: No negative marking.</p>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleSubmit}
            disabled={Object.keys(selectedAnswers).length < (testData?.questions.length || 0)}
          >
            Finish & Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
