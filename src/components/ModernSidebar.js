import React from 'react';
import {
  BarChart3, Users, Trophy, Package, UserPlus, Zap, Upload, History,
  Settings, LogOut, Moon, Sun, X, User, TrendingUp
} from 'lucide-react';

const ModernSidebar = ({
  activeSection, setActiveSection, currentUser, onLogout,
  isMobile, isCollapsed, setIsCollapsed, isDarkMode, setIsDarkMode
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'from-blue-500 to-blue-600', description: 'Panoramica generale' },
    { id: 'sm-ranking', label: 'Classifica SM', icon: Trophy, color: 'from-yellow-500 to-yellow-600', description: 'Ranking coordinatori' },
    { id: 'agents', label: 'Agenti', icon: Users, color: 'from-green-500 to-green-600', description: 'Gestione agenti' },
    { id: 'products', label: 'Prodotti', icon: Package, color: 'from-purple-500 to-purple-600', description: 'Analisi prodotti' },
    { id: 'new-clients', label: 'Nuovi Clienti', icon: UserPlus, color: 'from-pink-500 to-pink-600', description: 'Dashboard clienti' },
    { id: 'fastweb', label: 'Fastweb', icon: Zap, color: 'from-orange-500 to-orange-600', description: 'Contratti Fastweb' },
    { id: 'historical-analysis', label: 'Analisi Storia', icon: History, color: 'from-purple-500 to-purple-600', description: 'Analisi storica dei dati' },
    { id: 'files', label: 'Gestione File', icon: Upload, color: 'from-indigo-500 to-indigo-600', description: 'Upload e gestione' }
  ];

  const adminMenuItems = [
    { id: 'settings', label: 'Impostazioni', icon: Settings, color: 'from-slate-500 to-slate-600', description: 'Gestione utenti' }
  ];

  const handleItemClick = (itemId) => {
    setActiveSection(itemId);
    if (isMobile) setIsCollapsed(true);
  };

  return (
    <>
      {isMobile && !isCollapsed && (
        <div className="sidebar-overlay" onClick={() => setIsCollapsed(true)} />
      )}

      <div className={`modern-sidebar ${isCollapsed && isMobile ? 'collapsed' : ''} ${isDarkMode ? 'dark' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon"><TrendingUp size={32} /></div>
            {(!isCollapsed || !isMobile) && (
              <div className="brand-text">
                <h1>RUSH</h1>
                <span>Dashboard</span>
              </div>
            )}
          </div>
          {isMobile && (
            <button className="close-sidebar" onClick={() => setIsCollapsed(true)}>
              <X size={24} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="section-title">Principale</span>
            {menuItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button key={item.id} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => handleItemClick(item.id)}>
                  <div className={`nav-icon bg-gradient-to-r ${item.color}`}>
                    <Icon size={20} />
                  </div>
                  {(!isCollapsed || !isMobile) && (
                    <div className="nav-content">
                      <span className="nav-label">{item.label}</span>
                      <span className="nav-description">{item.description}</span>
                    </div>
                  )}
                  {isActive && <div className="active-indicator" />}
                </button>
              );
            })}
          </div>
          <div className="nav-section">
            <span className="section-title">Analisi</span>
            {menuItems.slice(4).map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button key={item.id} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => handleItemClick(item.id)}>
                  <div className={`nav-icon bg-gradient-to-r ${item.color}`}>
                    <Icon size={20} />
                  </div>
                  {(!isCollapsed || !isMobile) && (
                    <div className="nav-content">
                      <span className="nav-label">{item.label}</span>
                      <span className="nav-description">{item.description}</span>
                    </div>
                  )}
                  {isActive && <div className="active-indicator" />}
                </button>
              );
            })}
          </div>

          {currentUser?.role === 'admin' && (
            <div className="nav-section">
              <span className="section-title">Impostazioni</span>
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button key={item.id} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => handleItemClick(item.id)}>
                    <div className={`nav-icon bg-gradient-to-r ${item.color}`}>
                      <Icon size={20} />
                    </div>
                    {(!isCollapsed || !isMobile) && (
                      <div className="nav-content">
                        <span className="nav-label">{item.label}</span>
                        <span className="nav-description">{item.description}</span>
                      </div>
                    )}
                    {isActive && <div className="active-indicator" />}
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-section">
            <div className="user-avatar"><User size={24} /></div>
            {(!isCollapsed || !isMobile) && (
              <div className="user-info">
                <span className="user-name">{currentUser?.username || 'Admin'}</span>
                <span className="user-role">{currentUser?.role || 'Administrator'}</span>
              </div>
            )}
          </div>
          <div className="footer-actions">
            <button className="action-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="action-btn logout" onClick={onLogout}>
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModernSidebar;
