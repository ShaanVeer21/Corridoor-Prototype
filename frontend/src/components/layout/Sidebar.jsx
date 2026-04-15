import { useState } from 'react';
import logo from '../../assets/corridoor_logo.png';
import './Sidebar.css';

export default function Sidebar({ currentPage, onNavigate, theme, onToggleTheme }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'alerts', label: 'Alert Inbox', icon: '🚨' },
    { id: 'buildings', label: 'Buildings', icon: '🏢' },
    { id: 'noc', label: 'NOC Database', icon: '📋' },
    { id: 'upload', label: 'Upload NOC', icon: '📤' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar__logo">
        <img src={logo} alt="Corridoor" className="sidebar__logo-img" />
        <div className="sidebar__logo-text">
          <span className="sidebar__brand">CORRIDOOR</span>
          <span className="sidebar__jurisdiction">Thane Municipal Corp.</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar__nav-item ${currentPage === item.id ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            <span className="sidebar__nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="sidebar__bottom">
        {/* Theme toggle */}
        <button className="sidebar__theme-toggle" onClick={onToggleTheme}>
          <span className="sidebar__nav-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="sidebar__nav-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Encryption indicator */}
        <div className="sidebar__encryption">
          <span className="sidebar__encryption-icon">🔒</span>
          <span className="sidebar__encryption-text">Data Encrypted</span>
        </div>
      </div>
    </aside>
  );
}
