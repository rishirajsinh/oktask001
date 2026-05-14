import { Link } from 'react-router-dom';

const AccessDenied = () => {
  return (
    <div className="denied-container glass-container">
      <div className="denied-icon">⚠️</div>
      <h1>Access Denied</h1>
      <p style={{ marginBottom: '2rem' }}>
        You do not have permission to view this test. The link may be invalid, expired, or you haven't completed the payment.
      </p>
      <p style={{ marginTop: '1rem', fontStyle: 'italic', fontSize: '0.8rem' }}>
        Please contact your coordinator if you believe this is a mistake.
      </p>
    </div>
  );
};

export default AccessDenied;
