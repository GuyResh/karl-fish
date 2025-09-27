import React, { useState } from 'react';
import { X, User, Lock, Mail, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfflineMode: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onOfflineMode }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const { signIn, signUp } = useAuth();

  // Handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value); // Allow typing spaces freely
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!loginUsername || !password) {
      setError('Username and password are required.');
      setLoading(false);
      return;
    }

    try {
      await signIn(loginUsername, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password || !username || !name) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }

    if (name.length < 2) {
      setError('Name must be at least 2 characters.');
      setLoading(false);
      return;
    }

    try {
      // Normalize the name before sending
      const normalizedName = name.trim().replace(/\s+/g, ' ');
      await signUp(email, password, username, normalizedName);
      setShowEmailConfirmation(true);
      setError(null);
    } catch (err: any) {
      // Provide more specific error messages
      if (err.message?.includes('username') || err.message?.includes('duplicate')) {
        setError('Username already taken. Please choose a different username.');
      } else if (err.message?.includes('email')) {
        setError('Email already registered. Please use a different email or try signing in.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email) {
      setError('Email is required.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await AuthService.resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setError('Password reset email sent! Check your inbox.');
        setIsForgotPassword(false);
        setEmail('');
      }
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineMode = () => {
    onOfflineMode();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal auth-modal">
        <div className="modal-header">
          <h2>Karl Fish</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {isForgotPassword ? (
            // Forgot Password Form
            <form onSubmit={handleForgotPassword} className="auth-form">
              <h3>Reset Password</h3>
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label className="form-label" htmlFor="reset-email">
                  <Mail size={16} />
                  Email Address
                </label>
                <input
                  type="email"
                  id="reset-email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Sending...' : 'Reset Password'}
                </button>
              </div>
            </form>
          ) : (
            // Login/Register Form
            <form onSubmit={isLogin ? handleLogin : handleRegister} className="auth-form">
              {!isLogin && <h3>Create Account</h3>}
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label className="form-label" htmlFor={isLogin ? "loginUsername" : "username"}>
                  <User size={16} />
                  Username
                </label>
                <input
                  type="text"
                  id={isLogin ? "loginUsername" : "username"}
                  className="form-input"
                  value={isLogin ? loginUsername : username}
                  onChange={(e) => isLogin ? setLoginUsername(e.target.value) : setUsername(e.target.value)}
                  placeholder={isLogin ? "Enter your username" : "Choose a username"}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  <Lock size={16} />
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {!isLogin && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="email">
                      <Mail size={16} />
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="name">
                      <User size={16} />
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="form-input"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="John Doe"
                      minLength={2}
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
              </div>

              <div className="auth-links">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="link-button"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
                
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                    }}
                    className="link-button"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="offline-section">
                <button
                  type="button"
                  onClick={handleOfflineMode}
                  className="btn btn-outline"
                >
                  <WifiOff size={16} />
                  Continue Offline
                </button>
                <p className="offline-description">
                  Use the app without internet connection.
                </p>
                <p className="offline-description">
                  Data will ONLY be stored locally.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Email Confirmation Modal */}
      {showEmailConfirmation && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Check Your Email</h2>
            </div>
            <div className="modal-content">
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
                <h3>Account Created Successfully!</h3>
                <p>We've sent a confirmation email to <strong>{email}</strong></p>
                <p><strong>You must confirm your email before you can sign in.</strong></p>
                <p>Please check your inbox and click the confirmation link to activate your account.</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
                  Don't see the email? Check your spam folder.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowEmailConfirmation(false);
                  setIsLogin(true);
                  onClose(); // Close the modal entirely after registration
                }}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthModal;
