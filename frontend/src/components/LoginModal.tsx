import React, { useState } from 'react';
import { Lock, X, AlertTriangle } from 'lucide-react';
import { adminLogin } from '../api';
import './LoginModal.css';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
  const [adminId, setAdminId] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await adminLogin(adminId, adminPass);
      onLoginSuccess();
    } catch (err) {
      setError('Invalid admin credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-content fade-in-up">
        <button className="login-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <div className="login-modal-header">
          <div className="login-modal-icon">
            <Lock size={28} />
          </div>
          <h2>Admin Access</h2>
          <p>Please enter your credentials to access the admin panel.</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="adminId">Admin ID</label>
            <input
              type="text"
              id="adminId"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="Enter Admin ID"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="adminPass">Password</label>
            <input
              type="password"
              id="adminPass"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              placeholder="Enter Password"
              required
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Login to Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
