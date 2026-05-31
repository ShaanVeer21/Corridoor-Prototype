import { useLanguage, LANGUAGES } from '../../context/LanguageContext';
import logo from '../../assets/corridoor_logo.png';
import './Sidebar.css';

export default function Sidebar({ currentPage, onNavigate, theme, onToggleTheme }) {
  const { t, language, changeLanguage } = useLanguage();

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: '📊' },
    { id: 'alerts', label: t('nav.alerts'), icon: '🚨' },
    { id: 'buildings', label: t('nav.buildings'), icon: '🏢' },
    { id: 'noc', label: t('nav.noc'), icon: '📋' },
    { id: 'upload', label: t('nav.upload'), icon: '📤' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <img src={logo} alt="Corridoor" className="sidebar__logo-img" />
        <div className="sidebar__logo-text">
          <span className="sidebar__brand">CORRIDOOR</span>
          <span className="sidebar__jurisdiction">{t('sidebar.jurisdiction')}</span>
        </div>
      </div>

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

      <div className="sidebar__bottom">
        {/* Language switcher */}
        <div className="sidebar__lang-switcher">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`sidebar__lang-btn ${language === lang.code ? 'sidebar__lang-btn--active' : ''}`}
              onClick={() => changeLanguage(lang.code)}
              title={lang.label}
            >
              {lang.flag}
            </button>
          ))}
        </div>

        <button className="sidebar__theme-toggle" onClick={onToggleTheme}>
          <span className="sidebar__nav-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="sidebar__nav-label">{theme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}</span>
        </button>

        <div className="sidebar__encryption">
          <span className="sidebar__encryption-icon">🔒</span>
          <span className="sidebar__encryption-text">{t('sidebar.encrypted')}</span>
        </div>
      </div>
    </aside>
  );
}