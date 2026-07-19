import { HERITAGE, SAFFRON } from "../lib/supabase";

const footerStyles = `
  .app-footer {
    background: white;
    border-top: 1px solid #E5E7EB;
    padding: 24px 1.5rem;
  }
  .app-footer-inner {
    max-width: 1200px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    flex-wrap: wrap;
  }
  .app-footer-logo {
    display: flex; align-items: center; gap: 8px;
    font-family: 'Alumni Sans', sans-serif; font-size: 1.25rem; font-weight: 700;
    color: ${HERITAGE}; text-decoration: none;
  }
  .app-footer-logo img { height: 28px; width: auto; }
  .app-footer-copy {
    font-size: 0.8125rem; color: #6B6B6B;
    text-align: center; flex: 1;
  }
  .app-footer-social {
    display: flex; align-items: center; gap: 14px;
  }
  .app-footer-social a {
    color: #6B6B6B; font-size: 1.125rem; text-decoration: none;
    transition: color 0.2s;
  }
  .app-footer-social a:hover { color: ${SAFFRON}; }
  @media (max-width: 600px) {
    .app-footer-inner { flex-direction: column; align-items: center; text-align: center; gap: 12px; }
    .app-footer-copy { order: 3; flex: none; }
  }
`;

export default function AppFooter() {
  return (
    <>
      <style>{footerStyles}</style>
      <footer className="app-footer">
        <div className="app-footer-inner">
          {/* Logo */}
          <div className="app-footer-logo">
            <img
              src="https://indiyatra.in/wp-content/uploads/2023/02/My-project.png"
              alt="IndiYatra"
            />
          </div>

          {/* Copyright */}
          <div className="app-footer-copy">
            © {new Date().getFullYear()} IndiYatra. All rights reserved.
          </div>

          {/* Social links */}
          <div className="app-footer-social">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" title="Facebook">
              <i className="ti ti-brand-facebook" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" title="Instagram">
              <i className="ti ti-brand-instagram" />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" title="X / Twitter">
              <i className="ti ti-brand-x" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" title="LinkedIn">
              <i className="ti ti-brand-linkedin" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
