import { useState } from "react";
import { SAFFRON, HERITAGE, PARCHMENT } from "../lib/supabase";
import { signInWithProvider, signInWithEmail, signUpWithEmail, signInAnonymously } from "../lib/auth";
import { APP_NAME, AUTH } from "../config/appStrings";

const SAFFRON_VAL  = "#FF8E00";
const HERITAGE_VAL = "#00509E";
const PARCHMENT_VAL = "#FFFDF5";

const styles = `
  .auth-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  .auth-modal {
    background: #FFFFFF; border-radius: 16px;
    width: 100%; max-width: 440px;
    padding: 36px 32px 32px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.15); border: 1px solid #E5E7EB;
    position: relative;
    animation: authSlideUp 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both;
  }
  @keyframes authSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .auth-close {
    position: absolute; top: 16px; right: 16px;
    background: none; border: none; cursor: pointer;
    font-size: 20px; color: #4A5565; line-height: 1;
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; transition: background 0.15s;
  }
  .auth-close:hover { background: #F3F4F6; }
  .auth-title {
    font-family: 'Oswald', 'Arial Narrow', sans-serif;
    font-size: 28px; font-weight: 700; color: ${HERITAGE_VAL};
    margin-bottom: 4px; text-align: center;
  }
  .auth-subtitle {
    font-size: 14px; color: #4A5565; text-align: center; margin-bottom: 28px;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .auth-social-btn {
    width: 100%; padding: 12px 16px; border-radius: 12px;
    border: 1.5px solid #E5E7EB; background: #fff; cursor: pointer;
    display: flex; align-items: center; gap: 12px;
    font-size: 15px; font-weight: 600; color: #101828;
    margin-bottom: 10px; transition: border-color 0.15s, box-shadow 0.15s;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .auth-social-btn:hover { border-color: ${SAFFRON_VAL}; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .auth-social-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 20px 0; color: #4A5565; font-size: 13px;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .auth-divider::before, .auth-divider::after {
    content: ''; flex: 1; height: 1px; background: #E5E7EB;
  }
  .auth-input-group { margin-bottom: 14px; }
  .auth-input-label { font-size: 13px; font-weight: 600; color: #4A5565; margin-bottom: 6px; display: block; font-family: 'Inter', system-ui, sans-serif; }
  .auth-input {
    width: 100%; padding: 10px 14px; border-radius: 10px;
    border: 1.5px solid #E5E7EB; background: #fff;
    font-size: 15px; color: #101828; outline: none;
    box-sizing: border-box; transition: border-color 0.15s;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .auth-input:focus { border-color: ${SAFFRON_VAL}; }
  .auth-submit {
    width: 100%; padding: 13px; border-radius: 12px;
    background: ${SAFFRON_VAL}; color: #fff; font-size: 15px; font-weight: 500;
    border: none; cursor: pointer; margin-top: 8px; transition: opacity 0.15s;
    font-family: 'Inter', system-ui, sans-serif;
    box-shadow: 0px 1px 0.5px 0.05px rgba(29, 41, 61, 0.02);
  }
  .auth-submit:hover { opacity: 0.9; }
  .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-toggle { text-align: center; margin-top: 16px; font-size: 14px; color: #4A5565; font-family: 'Nunito Sans', system-ui, sans-serif; }
  .auth-toggle button {
    background: none; border: none; cursor: pointer;
    color: ${HERITAGE_VAL}; font-weight: 600; font-size: 14px;
    padding: 0; text-decoration: underline; font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .auth-guest-btn {
    width: 100%; padding: 11px 16px; border-radius: 12px;
    border: 1.5px solid #E5E7EB; background: transparent; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 14px; font-weight: 500; color: #4A5565;
    margin-top: 14px; transition: border-color 0.15s, color 0.15s;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .auth-guest-btn:hover { border-color: #4A5565; color: #101828; }
  .auth-guest-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-error {
    background: #fff0f0; border: 1px solid #ffcccc; border-radius: 8px;
    padding: 10px 14px; color: #c00; font-size: 13px;
    margin-bottom: 14px; text-align: center;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
  .auth-success {
    background: #f0fff4; border: 1px solid #b2f5c8; border-radius: 8px;
    padding: 10px 14px; color: #006600; font-size: 13px;
    margin-bottom: 14px; text-align: center;
    font-family: 'Nunito Sans', system-ui, sans-serif;
  }
`;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function AuthModal({ onClose }) {
  const [mode, setMode]       = useState("signin");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  function clearMessages() { setError(""); setSuccess(""); }

  async function handleGuest() {
    setLoading(true);
    clearMessages();
    const { error: err } = await signInAnonymously();
    if (err) { setError(err.message); setLoading(false); }
    else { onClose(); }
  }

  async function handleSocial(provider) {
    setLoading(true);
    clearMessages();
    const { error: err } = await signInWithProvider(provider);
    if (err) { setError(err.message); setLoading(false); }
    // On success: browser redirects to OAuth provider
  }

  async function handleEmail(e) {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    clearMessages();
    if (mode === "signin") {
      const { error: err } = await signInWithEmail(email, password);
      if (err) { setError(err.message); setLoading(false); }
      else { onClose(); }
    } else {
      const { error: err } = await signUpWithEmail(email, password);
      if (err) { setError(err.message); setLoading(false); }
      else { setSuccess("Check your email for a confirmation link!"); setLoading(false); }
    }
  }

  function switchMode(m) { setMode(m); clearMessages(); }

  return (
    <>
      <style>{styles}</style>
      <div className="auth-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="auth-modal">
          <button className="auth-close" onClick={onClose} aria-label="Close">&#x2715;</button>
          <div className="auth-title">{APP_NAME}</div>
          <div className="auth-subtitle">
            {mode === "signin" ? AUTH.signinSubtitle : AUTH.signupSubtitle}
          </div>

          {error   && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button className="auth-social-btn" onClick={() => handleSocial("google")} disabled={loading}>
            <GoogleIcon /> {AUTH.continueGoogle}
          </button>


          <div className="auth-divider">or</div>

          <form onSubmit={handleEmail}>
            <div className="auth-input-group">
              <label className="auth-input-label">Email</label>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="auth-input-group">
              <label className="auth-input-label">Password</label>
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? AUTH.pleaseWait : mode === "signin" ? AUTH.signIn : AUTH.createAccountCta}
            </button>
          </form>

          <div className="auth-toggle">
            {mode === "signin" ? (
              <>{AUTH.newHere}{" "}
                <button type="button" onClick={() => switchMode("signup")}>{AUTH.createAccount}</button>
              </>
            ) : (
              <>{AUTH.alreadyHave}{" "}
                <button type="button" onClick={() => switchMode("signin")}>{AUTH.signIn}</button>
              </>
            )}
          </div>

          <button className="auth-guest-btn" onClick={handleGuest} disabled={loading}>
            &#x1F465; {AUTH.continueGuest}
          </button>
        </div>
      </div>
    </>
  );
}
