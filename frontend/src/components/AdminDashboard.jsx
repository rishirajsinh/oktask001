import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [email, setEmail] = useState('');
  const [testId, setTestId] = useState('PYTHON_TEST_2024');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');

  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === 'rishi0806') { // Updated password
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert('Incorrect Admin Passcode');
    }
  };

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/data`);
      setStudents(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/admin/add-student`, { email, testId });
      setMessage(`Success: Student added!`);
      setEmail('');
      fetchData();
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.error || 'Failed to add'}`);
    }
  };

  const handleDelete = async (studentEmail) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await axios.delete(`${API_URL}/admin/student/${studentEmail}`);
        fetchData();
      } catch (err) {
        alert('Failed to delete');
      }
    }
  };

  const copyLink = (token) => {
    const link = `${window.location.origin}/test/${token}`;
    navigator.clipboard.writeText(link);
    alert('Test Link Copied!');
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div className="admin-glass-card login-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <header className="admin-header">
            <h1>Admin Login</h1>
            <p>Enter passcode to continue</p>
          </header>
          <form onSubmit={handleLogin} className="admin-form" style={{ flexDirection: 'column' }}>
            <input 
              type="password" 
              placeholder="Admin Passcode" 
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="btn-primary">Unlock Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-glass-card">
        <header className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>Manage access and track performance</p>
        </header>

        <section className="admin-form-section">
          <h3>Add New Student</h3>
          <form onSubmit={handleAddStudent} className="admin-form">
            <input 
              type="email" 
              placeholder="Student Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input 
              type="text" 
              placeholder="Test ID" 
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">Generate Access</button>
          </form>
          {message && <p className="status-msg">{message}</p>}
        </section>

        <section className="admin-table-section">
          <div className="table-header">
            <h3>Registered Students</h3>
            <button onClick={fetchData} className="btn-refresh">Refresh Data</button>
          </div>
          
          {loading ? (
            <p>Loading data...</p>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Test ID</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id}>
                      <td>{s.email}</td>
                      <td>{s.testId}</td>
                      <td>
                        <span className={`badge ${s.score !== null ? 'success' : 'pending'}`}>
                          {s.score !== null ? 'Completed' : 'Active'}
                        </span>
                      </td>
                      <td>
                        {s.score !== null ? (
                          <span className="score-text">{s.score} / {s.totalQuestions} ({s.percentage})</span>
                        ) : (
                          <span className="no-score">-</span>
                        )}
                      </td>
                      <td className="actions">
                        <button onClick={() => copyLink(s.token)} className="btn-icon" title="Copy Link">
                          🔗 Link
                        </button>
                        <button onClick={() => handleDelete(s.email)} className="btn-icon delete" title="Delete">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-state">No students found. Add one above!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
