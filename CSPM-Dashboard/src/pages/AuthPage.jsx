import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Password strength ─────────────────────────────────────────────────────────
function passwordStrength(pw) {
  if (!pw) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak",        color: "var(--red)" };
  if (score <= 2) return { level: 2, label: "Fair",        color: "var(--orange)" };
  if (score <= 3) return { level: 3, label: "Good",        color: "var(--yellow)" };
  if (score <= 4) return { level: 4, label: "Strong",      color: "var(--green)" };
  return                { level: 5, label: "Very strong",  color: "var(--green)" };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PasswordField({ label, value, onChange, showStrength = false }) {
  const [show, setShow] = useState(false);
  const strength = showStrength ? passwordStrength(value) : null;

  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={S.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          placeholder="••••••••"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...S.input, paddingRight: "42px" }}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={S.eyeBtn}
          tabIndex={-1}
          title={show ? "Hide password" : "Show password"}
        >
          {show
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        </button>
      </div>
      {showStrength && value && (
        <>
          <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                flex: 1, height: "3px", borderRadius: "2px",
                background: strength.level >= i ? strength.color : "var(--border)",
                transition: "background 0.2s",
              }} />
            ))}
          </div>
          <div style={{ fontSize: "10px", marginTop: "5px", color: strength.color,
                        fontFamily: "var(--font-ui)" }}>
            {strength.label}
          </div>
        </>
      )}
    </div>
  );
}

function TextField({ label, type = "text", placeholder, value, onChange }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={S.label}>{label}</label>
      <input
        type={type} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)}
        style={S.input} autoComplete="off"
      />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  label: {
    display: "block", color: "var(--accent3)", fontSize: "11px",
    letterSpacing: "0.08em", marginBottom: "6px",
    fontFamily: "var(--font-ui)", fontWeight: 600, textTransform: "uppercase",
  },
  input: {
    width: "100%", background: "var(--surface)",
    border: "1px solid var(--border)", borderRadius: "var(--radius)",
    padding: "11px 14px", color: "var(--accent)",
    fontFamily: "var(--font-mono)", fontSize: "13px",
    boxSizing: "border-box", outline: "none", transition: "border-color 0.15s",
  },
  eyeBtn: {
    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer",
    color: "var(--accent3)", padding: "0", display: "flex", alignItems: "center",
    transition: "color 0.15s",
  },
  error: {
    padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: "14px",
    background: "rgba(239,68,68,0.08)", color: "var(--red)",
    border: "1px solid rgba(239,68,68,0.2)",
    fontSize: "12px", fontFamily: "var(--font-ui)",
  },
  success: {
    padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: "14px",
    background: "rgba(16,185,129,0.08)", color: "var(--green)",
    border: "1px solid rgba(16,185,129,0.2)",
    fontSize: "12px", fontFamily: "var(--font-ui)",
  },
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AuthPage({ onAuth, initialResetToken = null, initialInviteToken = null }) {
  const initialTab = initialInviteToken ? "invite" : initialResetToken ? "reset" : "login";
  const [tab,         setTab]         = useState(initialTab);
  const [name,        setName]        = useState("");
  const [username,    setUsername]    = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [resetPw,     setResetPw]     = useState("");
  const [invitePw,    setInvitePw]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(null);
  const [resetToken,  setResetToken]  = useState(initialResetToken || "");
  const [inviteToken, setInviteToken] = useState(initialInviteToken || "");
  const [inviteInfo,  setInviteInfo]  = useState(null);
  // MFA step state
  const [mfaPending,  setMfaPending]  = useState(null); // {mfa_token}
  const [mfaCode,     setMfaCode]     = useState("");
  const [useBackup,   setUseBackup]   = useState(false);

  useEffect(() => {
    if (initialInviteToken) {
      fetch(`${API}/invite/${initialInviteToken}`)
        .then(r => r.json())
        .then(d => {
          if (d.email) setInviteInfo({ email: d.email, role: d.role });
          else setError("This invite link is invalid or has expired.");
        })
        .catch(() => setError("Unable to validate invite link."));
    }
  }, []);

  function switchTab(t) {
    setTab(t);
    setError(null); setSuccess(null);
    setName(""); setUsername(""); setEmail(""); setPassword(""); setResetPw(""); setInvitePw("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  async function handleSubmit() {
    setError(null); setSuccess(null);
    if (tab === "login")  return handleLogin();
    if (tab === "forgot") return handleForgot();
    if (tab === "reset")  return handleReset();
    if (tab === "invite") return handleAcceptInvite();
  }

  async function handleLogin() {
    if (!username || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Login failed."); return; }
      if (data.mfa_required) {
        setMfaPending({ mfa_token: data.mfa_token });
        setMfaCode(""); setUseBackup(false); setError(null);
        return;
      }
      onAuth(data.token, data.user);
    } catch { setError("Unable to connect. Please try again."); }
    finally  { setLoading(false); }
  }

  async function handleMfaVerify() {
    if (!mfaCode.trim()) { setError("Please enter your authentication code."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/auth/mfa/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfa_token: mfaPending.mfa_token, code: mfaCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Invalid code."); return; }
      onAuth(data.token, data.user);
    } catch { setError("Unable to connect. Please try again."); }
    finally  { setLoading(false); }
  }

  async function handleSignup() {
    if (!username || !email || !password || !name) { setError("Please fill in all fields."); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Sign up failed."); return; }
      onAuth(data.token, data.user);
    } catch { setError("Unable to connect. Please try again."); }
    finally  { setLoading(false); }
  }

  async function handleForgot() {
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Request failed."); return; }
      setSuccess("If that email is registered, a reset link has been sent.");
    } catch { setError("Unable to connect. Please try again."); }
    finally  { setLoading(false); }
  }

  async function handleReset() {
    if (!resetPw) { setError("Please enter a new password."); return; }
    if (resetPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!resetToken) { setError("Missing reset token. Please use the link from your email."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, new_password: resetPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Reset failed."); return; }
      setSuccess("Password updated! You can now sign in with your new password.");
      setTimeout(() => switchTab("login"), 2500);
    } catch { setError("Unable to connect. Please try again."); }
    finally  { setLoading(false); }
  }

  async function handleAcceptInvite() {
    if (!name || !username || !invitePw) { setError("All fields are required."); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (invitePw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!inviteToken) { setError("Missing invite token."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/accept-invite`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken, name, username, password: invitePw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Could not complete signup."); return; }
      onAuth(data.token, data.user);
    } catch { setError("Unable to connect. Please try again."); }
    finally  { setLoading(false); }
  }

  function renderMfaForm() {
    return (
      <div style={{ padding: "28px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
          padding: "12px 14px", borderRadius: 8,
          background: "rgba(0,188,212,0.06)", border: "1px solid rgba(0,188,212,0.2)",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="var(--cyan)" strokeWidth="2">
            <rect x="5" y="11" width="14" height="10" rx="2"/>
            <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
          </svg>
          <span style={{ fontSize: 12, fontFamily: "var(--font-ui)", color: "var(--accent2)", lineHeight: 1.5 }}>
            {useBackup
              ? "Enter one of your 8-character backup codes."
              : "Enter the 6-digit code from your authenticator app."}
          </span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>{useBackup ? "BACKUP CODE" : "AUTHENTICATOR CODE"}</label>
          <input
            autoFocus
            type="text"
            inputMode={useBackup ? "text" : "numeric"}
            placeholder={useBackup ? "XXXXXXXX" : "000000"}
            maxLength={useBackup ? 8 : 6}
            value={mfaCode}
            onChange={e => setMfaCode(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleMfaVerify()}
            style={{
              ...S.input,
              letterSpacing: "0.25em", textAlign: "center",
              fontSize: 20, fontFamily: "var(--font-mono)",
            }}
          />
        </div>

        <span
          onClick={() => { setUseBackup(b => !b); setMfaCode(""); setError(null); }}
          style={{
            display: "block", textAlign: "center", marginBottom: 16,
            color: "var(--accent3)", fontSize: 12, fontFamily: "var(--font-ui)",
            cursor: "pointer", transition: "color 0.15s",
          }}
          onMouseEnter={e => e.target.style.color = "var(--cyan)"}
          onMouseLeave={e => e.target.style.color = "var(--accent3)"}
        >
          {useBackup ? "← Use authenticator app instead" : "Use a backup code instead"}
        </span>

        {error && <div style={S.error}>{error}</div>}

        <button onClick={handleMfaVerify} disabled={loading} style={btnStyle(loading)}>
          {loading ? "Verifying..." : "Verify"}
        </button>

        <span
          onClick={() => { setMfaPending(null); setError(null); setMfaCode(""); }}
          style={{
            display: "block", textAlign: "center", marginTop: 14,
            color: "var(--accent3)", fontSize: 12, fontFamily: "var(--font-ui)",
            cursor: "pointer", transition: "color 0.15s",
          }}
          onMouseEnter={e => e.target.style.color = "var(--accent)"}
          onMouseLeave={e => e.target.style.color = "var(--accent3)"}
        >
          ← Back to sign in
        </span>
      </div>
    );
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  const btnStyle = (isLoading) => ({
    width: "100%", padding: "12px",
    background: isLoading ? "transparent" : "var(--cyan)",
    color: isLoading ? "var(--accent3)" : "#0e0c09",
    border: isLoading ? "1px solid var(--border)" : "none",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "13px",
    letterSpacing: "0.04em", cursor: isLoading ? "not-allowed" : "pointer",
    transition: "all 0.15s",
  });

  function renderLoginForm() {
    return (
      <div style={{ padding: "28px" }} onKeyDown={handleKeyDown}>
        <TextField label="Username" placeholder="your username"
                   value={username} onChange={setUsername} />
        <PasswordField label="Password" value={password} onChange={setPassword} />

        <span
          style={{
            display: "block", textAlign: "right", marginTop: "-8px", marginBottom: "14px",
            color: "var(--accent3)", fontSize: "12px", fontFamily: "var(--font-ui)",
            cursor: "pointer", transition: "color 0.15s",
          }}
          onClick={() => switchTab("forgot")}
          onMouseEnter={e => e.target.style.color = "var(--cyan)"}
          onMouseLeave={e => e.target.style.color = "var(--accent3)"}
        >
          Forgot password?
        </span>

        {error   && <div style={S.error}>{error}</div>}
        {success && <div style={S.success}>{success}</div>}

        <button onClick={handleSubmit} disabled={loading} style={btnStyle(loading)}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    );
  }

  function renderSignupForm() {
    return (
      <div style={{ padding: "28px" }} onKeyDown={handleKeyDown}>
        <TextField label="Full Name" placeholder="Your name"
                   value={name} onChange={setName} />
        <TextField label="Username" placeholder="choose a username"
                   value={username} onChange={setUsername} />
        <TextField label="Email" type="email" placeholder="you@example.com"
                   value={email} onChange={setEmail} />
        <PasswordField label="Password" value={password} onChange={setPassword} showStrength />

        {error   && <div style={S.error}>{error}</div>}
        {success && <div style={S.success}>{success}</div>}

        <button onClick={handleSubmit} disabled={loading} style={btnStyle(loading)}>
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p style={{
          textAlign: "center", marginTop: "16px",
          color: "var(--accent3)", fontSize: "12px", fontFamily: "var(--font-ui)",
        }}>
          Already have an account?{" "}
          <span style={{ color: "var(--cyan)", cursor: "pointer", fontWeight: 600 }}
                onClick={() => switchTab("login")}>Sign in</span>
        </p>
      </div>
    );
  }

  function renderForgotForm() {
    return (
      <div style={{ padding: "28px" }} onKeyDown={handleKeyDown}>
        <span
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            color: "var(--accent3)", fontSize: "12px", fontFamily: "var(--font-ui)",
            cursor: "pointer", marginBottom: "20px", transition: "color 0.15s",
          }}
          onClick={() => switchTab("login")}
          onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--accent3)"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to sign in
        </span>

        <p style={{ color: "var(--accent3)", fontSize: "13px", marginTop: 0, marginBottom: "20px",
                    fontFamily: "var(--font-ui)", lineHeight: 1.6 }}>
          Enter your email and we'll send you a reset link if that account exists.
        </p>

        <TextField label="Email" type="email" placeholder="you@example.com"
                   value={email} onChange={setEmail} />

        {error   && <div style={S.error}>{error}</div>}
        {success && <div style={S.success}>{success}</div>}

        <button onClick={handleSubmit} disabled={loading} style={btnStyle(loading)}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </div>
    );
  }

  function renderResetForm() {
    return (
      <div style={{ padding: "28px" }} onKeyDown={handleKeyDown}>
        <p style={{ color: "var(--accent3)", fontSize: "13px", marginTop: 0, marginBottom: "20px",
                    fontFamily: "var(--font-ui)", lineHeight: 1.6 }}>
          Enter your new password below.
        </p>

        <PasswordField label="New Password" value={resetPw} onChange={setResetPw} showStrength />

        {error   && <div style={S.error}>{error}</div>}
        {success && <div style={S.success}>{success}</div>}

        <button onClick={handleSubmit} disabled={loading} style={btnStyle(loading)}>
          {loading ? "Updating..." : "Set New Password"}
        </button>

        <p style={{
          textAlign: "center", marginTop: "16px",
          color: "var(--accent3)", fontSize: "12px", fontFamily: "var(--font-ui)",
        }}>
          <span style={{ color: "var(--cyan)", cursor: "pointer", fontWeight: 600 }}
                onClick={() => switchTab("login")}>Back to sign in</span>
        </p>
      </div>
    );
  }

  function renderInviteForm() {
    return (
      <div style={{ padding: "28px" }} onKeyDown={handleKeyDown}>
        {inviteInfo ? (
          <div style={{
            padding: "12px 14px", borderRadius: "var(--radius)", marginBottom: 20,
            background: "rgba(79,143,247,0.06)", border: "1px solid rgba(79,143,247,0.15)",
            fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--accent2)", lineHeight: 1.6,
          }}>
            You've been invited as <strong style={{ color: "var(--cyan)" }}>{inviteInfo.role.toUpperCase()}</strong> for{" "}
            <strong style={{ color: "var(--accent)" }}>{inviteInfo.email}</strong>.
            Set up your account below.
          </div>
        ) : null}

        <TextField label="Full Name" placeholder="Your name"
                   value={name} onChange={setName} />
        <TextField label="Username" placeholder="choose a username"
                   value={username} onChange={setUsername} />
        <PasswordField label="Password" value={invitePw} onChange={setInvitePw} showStrength />

        {error   && <div style={S.error}>{error}</div>}
        {success && <div style={S.success}>{success}</div>}

        <button onClick={handleSubmit} disabled={loading} style={btnStyle(loading)}>
          {loading ? "Creating account..." : "Complete Setup"}
        </button>
      </div>
    );
  }

  // ── Layout ──────────────────────────────────────────────────────────────────

  // MFA step overrides everything
  if (mfaPending) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", padding: "40px 20px", background: "var(--bg)", position: "relative",
      }}>
        <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900,
              color: "var(--cyan)", letterSpacing: "0.1em",
            }}>VANGUARD</div>
            <div style={{
              color: "var(--accent3)", fontSize: 12, marginTop: 6,
              fontFamily: "var(--font-ui)", letterSpacing: "0.06em",
            }}>Two-Factor Authentication</div>
          </div>
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", overflow: "hidden",
            boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
          }}>
            <div style={{
              padding: "14px 28px", color: "var(--accent)", fontFamily: "var(--font-ui)",
              fontWeight: 700, fontSize: 14, borderBottom: "1px solid var(--border)",
            }}>Verify Identity</div>
            {renderMfaForm()}
          </div>
        </div>
      </div>
    );
  }

  const isForgotOrReset = tab === "forgot" || tab === "reset" || tab === "invite";

  const tabTitle = tab === "forgot" ? "Reset Password"
    : tab === "reset" ? "New Password"
    : tab === "invite" ? "Complete Invitation"
    : "Sign In";

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "40px 20px",
      background: "var(--bg)", position: "relative",
    }}>

      {/* Subtle gradient blobs */}
      <div style={{
        position: "fixed", top: "-20%", left: "-10%", width: "50%", height: "50%",
        background: "radial-gradient(circle, rgba(79,143,247,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: "-10%", right: "-10%", width: "40%", height: "40%",
        background: "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 900,
            color: "var(--cyan)", letterSpacing: "0.1em",
          }}>VANGUARD</div>
          <div style={{
            color: "var(--accent3)", fontSize: "12px", marginTop: "6px",
            fontFamily: "var(--font-ui)", letterSpacing: "0.06em",
          }}>
            {tab === "forgot" ? "Password Recovery" :
             tab === "reset"  ? "Set New Password"  :
             tab === "invite" ? "Account Setup"      :
             "Cloud Security Posture Management"}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
        }}>

          {/* Tab header */}
          <div style={{
            padding: "14px 28px",
            color: "var(--accent)", fontFamily: "var(--font-ui)",
            fontWeight: 700, fontSize: "14px",
            borderBottom: "1px solid var(--border)",
          }}>{tabTitle}</div>

          {/* Forms */}
          {tab === "login"  && renderLoginForm()}
          {tab === "forgot" && renderForgotForm()}
          {tab === "reset"  && renderResetForm()}
          {tab === "invite" && renderInviteForm()}
        </div>
      </div>
    </div>
  );
}
