import React, { useState } from 'react';
import { Sun, Moon, User, Lock, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess, theme, toggleTheme }) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTabChange = (isLogin) => {
    setIsLoginTab(isLogin);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('请输入用户名');
      return;
    }
    if (!password) {
      setErrorMsg('请输入密码');
      return;
    }

    if (!isLoginTab) {
      if (!confirmPassword) {
        setErrorMsg('请确认您的密码');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('两次输入的密码不一致');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = isLoginTab ? '/api/auth/login' : '/api/auth/register';
      const payload = isLoginTab 
        ? { username: username.trim(), password }
        : { username: username.trim(), password, confirmPassword };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const res = await response.json();

      if (!response.ok || !res.success) {
        throw new Error(res.message || '操作失败，请重试');
      }

      if (isLoginTab) {
        // Save tokens and trigger callback
        localStorage.setItem('gis_access_token', res.accessToken);
        localStorage.setItem('gis_refresh_token', res.refreshToken);
        onLoginSuccess(res.user, res.accessToken);
      } else {
        setSuccessMsg('注册成功！请切换到登录页进行登录');
        setIsLoginTab(true);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      <style>{`
        .login-screen-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100%;
          padding: 1.5rem;
          box-sizing: border-box;
          position: relative;
        }

        .login-theme-toggle {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 50%;
          width: 2.75rem;
          height: 2.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: var(--glass-blur);
          box-shadow: var(--shadow-sm);
          z-index: 10;
        }

        .login-theme-toggle:hover {
          transform: scale(1.05);
          border-color: var(--accent);
          color: var(--accent);
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 18px;
          padding: 2.5rem 2rem;
          backdrop-filter: var(--glass-blur);
          box-shadow: var(--shadow-lg);
          transition: all 0.3s ease;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-logo {
          background: var(--accent);
          color: var(--bg-dark);
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 1rem;
          box-shadow: 0 4px 15px var(--accent-muted);
        }

        .login-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .login-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 0.5rem;
          margin-bottom: 0;
        }

        .login-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 2rem;
          gap: 1.5rem;
        }

        .login-tab-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1rem;
          font-weight: 600;
          padding: 0.5rem 0.2rem;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
        }

        .login-tab-btn.active {
          color: var(--accent);
        }

        .login-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent);
          border-radius: 2px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .input-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.75rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .login-input {
          width: 100%;
          padding: 0.75rem 0.75rem 0.75rem 2.25rem;
          background: rgba(var(--text-primary-rgb, 0, 0, 0), 0.04);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        [data-theme="orderly"] .login-input {
          background: rgba(255, 255, 255, 0.03);
        }

        .login-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-muted);
          background: rgba(var(--text-primary-rgb, 0, 0, 0), 0.08);
        }

        .alert-box {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          line-height: 1.4;
          box-sizing: border-box;
        }

        .alert-box.error {
          background: var(--danger-glow);
          border: 1px solid var(--danger);
          color: var(--danger);
        }

        .alert-box.success {
          background: var(--success-glow);
          border: 1px solid var(--success);
          color: var(--success);
        }

        .submit-btn {
          background: var(--accent);
          color: var(--bg-dark, #fff);
          border: none;
          border-radius: 8px;
          padding: 0.85rem;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          box-shadow: 0 4px 12px var(--accent-muted);
          transition: all 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px var(--accent-muted);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Tiny loading spinner inside button */
        .btn-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Theme Switcher */}
      <button className="login-theme-toggle" onClick={toggleTheme} title="切换主题">
        {theme === 'orderly' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Main Glass Panel Card */}
      <div className="login-card">
        <div className="login-header">
          <img 
            src="/logo.png" 
            alt="Echo Logo" 
            style={{ 
              width: '56px', 
              height: '56px', 
              objectFit: 'cover', 
              borderRadius: '12px',
              marginBottom: '1rem',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }} 
          />
          <h2 className="login-title" style={{ fontFamily: 'var(--font-display)', fontWeight: '800' }}>Echo</h2>
          <p className="login-subtitle">用算法与 AI 精准背诵每一个考点</p>
        </div>

        {/* Tab Controls */}
        <div className="login-tabs">
          <button 
            type="button" 
            className={`login-tab-btn ${isLoginTab ? 'active' : ''}`}
            onClick={() => handleTabChange(true)}
          >
            账户登录
          </button>
          <button 
            type="button" 
            className={`login-tab-btn ${!isLoginTab ? 'active' : ''}`}
            onClick={() => handleTabChange(false)}
          >
            新用户注册
          </button>
        </div>

        {/* Form Container */}
        <form className="login-form" onSubmit={handleSubmit}>
          {/* Alerts */}
          {errorMsg && (
            <div className="alert-box error animate-fade">
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box success animate-fade">
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Username */}
          <div className="input-group">
            <label className="input-label">用户名</label>
            <div className="input-field-wrapper">
              <User className="input-icon" size={16} />
              <input 
                type="text" 
                className="login-input" 
                placeholder="请输入您的用户名" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="input-group">
            <label className="input-label">密码</label>
            <div className="input-field-wrapper">
              <Lock className="input-icon" size={16} />
              <input 
                type="password" 
                className="login-input" 
                placeholder="请输入您的密码" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Confirm Password (only for Registration) */}
          {!isLoginTab && (
            <div className="input-group">
              <label className="input-label">确认密码</label>
              <div className="input-field-wrapper">
                <ShieldCheck className="input-icon" size={16} />
                <input 
                  type="password" 
                  className="login-input" 
                  placeholder="请再次输入您的密码" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button 
            type="submit" 
            className="submit-btn" 
            disabled={loading}
          >
            {loading && <div className="btn-spinner"></div>}
            <span>{isLoginTab ? '立 即 登 录' : '立 即 注 册'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
