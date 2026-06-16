import React from 'react';
import { Settings as SettingsIcon, Sun, Moon, ArrowLeft } from 'lucide-react';
import BottomNav from './BottomNav';

export default function AppShell({ 
  children, 
  activeTab, 
  setActiveTab, 
  onExitSession,
  theme, 
  toggleTheme, 
  backendAvailable, 
  sessionFilter 
}) {
  const isImmersive = activeTab === 'today-review' || activeTab === 'recite' || activeTab === 'practice';

  const getSessionTitle = () => {
    if (activeTab === 'today-review') {
      if (sessionFilter === 'learn') return '今日新学 - 检测';
      if (sessionFilter === 'review') return '到期复习 - 检测';
      if (sessionFilter === 'forgot') return '错题回炉 - 检测';
      return '主动回忆自测';
    }
    if (activeTab === 'recite') {
      return '卡片带背模式';
    }
    if (activeTab === 'practice') {
      return '专项回忆练习';
    }
    return '';
  };

  return (
    <div className="app-container" data-theme={theme || 'misty-rose'}>
      {/* Header */}
      <header className={`nav-header ${isImmersive ? 'immersive-header' : ''}`}>
        {isImmersive ? (
          <div className="header-immersive-left">
            <button className="back-btn" onClick={onExitSession || (() => setActiveTab('home'))}>
              <ArrowLeft size={20} />
              <span>退出</span>
            </button>
            <div className="header-session-title">{getSessionTitle()}</div>
          </div>
        ) : (
          <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img 
              src="/logo.png" 
              alt="Echo Logo" 
              style={{ 
                width: '32px', 
                height: '32px', 
                objectFit: 'cover', 
                borderRadius: '8px',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }} 
            />
            <div>
              <span className="logo-title" style={{ fontWeight: '800' }}>Echo</span>
              <span className="backend-status-text">
                {backendAvailable ? '🟢 PostgreSQL 数据源已连接' : '🔵 独立运行中'}
              </span>
            </div>
            <span className="logo-badge">V4.0</span>
          </div>
        )}

        <div className="header-actions">
          {/* Quick Theme Toggle */}
          <button className="icon-btn theme-toggle-btn" onClick={toggleTheme} title="切换主题">
            {theme === 'orderly' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {/* Settings button, hidden when already in settings or immersive */}
          {!isImmersive && activeTab !== 'settings' && (
            <button className="icon-btn settings-nav-btn" onClick={() => setActiveTab('settings')} title="设置">
              <SettingsIcon size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={`main-content ${isImmersive ? 'immersive-content' : ''}`}>
        {children}
      </main>

      {/* Bottom Nav */}
      {!isImmersive && (
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </div>
  );
}
