import './Header.css';

export default function Header({ title, subtitle, children }) {
  return (
    <header className="header">
      <div className="header__left">
        <h1 className="header__title">{title}</h1>
        {subtitle && <p className="header__subtitle">{subtitle}</p>}
      </div>
      {children && <div className="header__right">{children}</div>}
    </header>
  );
}
