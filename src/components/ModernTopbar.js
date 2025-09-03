import React from 'react';
import { useData } from '../App';
import {
  Menu, User, ChevronRight, Activity, Calendar, Home
} from 'lucide-react';

const ModernTopbar = ({ activeSection, isMobile, isCollapsed, setIsCollapsed, currentUser, isDarkMode }) => {
  const { data } = useData();
  const sectionTitles = {
    dashboard: 'Dashboard',
    'sm-ranking': 'Classifica Sales Manager',
    agents: 'Gestione Agenti',
    products: 'Analisi Prodotti',
    'new-clients': 'Nuovi Clienti',
    fastweb: 'Fastweb Energia',
    files: 'Gestione File'
  };

  return (
    <header className={`modern-topbar ${isDarkMode ? 'dark' : ''}`}>
      <div className="topbar-left">
        {isMobile && (
          <button className="menu-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
            <Menu size={24} />
          </button>
        )}
        <div className="breadcrumb">
          <Home size={16} />
          <ChevronRight size={16} />
          <span>{sectionTitles[activeSection] || 'Dashboard'}</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="quick-stats">
          <div className="stat-item">
            <Activity size={16} />
            <span>{data.uploadedFiles?.length || 0} Files</span>
          </div>
          <div className="stat-item">
            <Calendar size={16} />
            <span>{new Date().toLocaleDateString('it-IT')}</span>
          </div>
        </div>
        <div className="user-menu">
          <div className="user-avatar-small"><User size={18} /></div>
          <div className="user-details">
            <span className="user-name-small">{currentUser?.username || 'Admin'}</span>
            <span className="user-status">Online</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ModernTopbar;
