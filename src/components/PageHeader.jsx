import { logoUrl } from "../lib/supabase";

export default function PageHeader({ onHome, onOpenSettings, navLinks = [] }) {
  return (
    <header className="app-header">
      <div className="header-logo" onClick={onHome}>
        <img src={logoUrl} alt="IndiYatra" onError={e => { e.target.style.display = "none"; }} />
      </div>
      <nav className="header-nav">
        {navLinks.map((l, i) => (
          <a key={i} onClick={l.onClick}>{l.label}</a>
        ))}
      </nav>
      <div className="header-right">
        <button className="header-settings-btn" onClick={onOpenSettings} title="Settings">⚙</button>
        <button className="register-btn">Sign In</button>
      </div>
    </header>
  );
}
