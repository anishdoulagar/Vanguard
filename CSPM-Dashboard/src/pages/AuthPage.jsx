import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function validatePassword(pw) {
  if (!pw || pw.length < 8)       return "At least 8 characters required.";
  if (!/[A-Z]/.test(pw))          return "Must include at least one uppercase letter.";
  if (!/[a-z]/.test(pw))          return "Must include at least one lowercase letter.";
  if (!/[^A-Za-z0-9]/.test(pw))   return "Must include at least one special character (!@#$…).";
  return null;
}

function PasswordRequirements({ pw }) {
  const reqs = [
    { label: "8+ characters",            met: pw.length >= 8 },
    { label: "Uppercase (A–Z)",           met: /[A-Z]/.test(pw) },
    { label: "Lowercase (a–z)",           met: /[a-z]/.test(pw) },
    { label: "Special character (!@#…)",  met: /[^A-Za-z0-9]/.test(pw) },
  ];
  if (!pw) return null;
  return (
    <div style={{ marginTop: 6, marginBottom: 4, display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
      {reqs.map(r => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "var(--font-ui)", color: r.met ? "#1aae39" : "#a39e98" }}>
          <span style={{ fontSize: 9 }}>{r.met ? "●" : "○"}</span>
          {r.label}
        </div>
      ))}
    </div>
  );
}

function passwordStrength(pw) {
  if (!pw) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)          score++;
  if (pw.length >= 12)         score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak",        color: "#e03e3e" };
  if (score <= 2) return { level: 2, label: "Fair",        color: "#dd5b00" };
  if (score <= 3) return { level: 3, label: "Good",        color: "#dfab01" };
  if (score <= 4) return { level: 4, label: "Strong",      color: "#1aae39" };
  return                { level: 5, label: "Very strong",  color: "#1aae39" };
}

// ── Floating label input ───────────────────────────────────────────────────────
function FloatInput({ label, type = "text", value, onChange, placeholder = "", autoFocus, children }) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <label style={{
        position: "absolute", left: 12, zIndex: 1, pointerEvents: "none",
        top: lifted ? 7 : "50%",
        transform: lifted ? "none" : "translateY(-50%)",
        fontSize: lifted ? 10 : 14,
        fontWeight: lifted ? 600 : 400,
        letterSpacing: lifted ? "0.04em" : "-0.006em",
        textTransform: lifted ? "uppercase" : "none",
        color: focused ? "rgba(0,0,0,0.7)" : "#a39e98",
        fontFamily: "var(--font-ui)",
        transition: "all 0.15s cubic-bezier(0.23,1,0.32,1)",
        willChange: "top, font-size",
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        placeholder={focused ? placeholder : ""}
        style={{
          width: "100%",
          paddingTop: lifted ? 19 : 12,
          paddingBottom: lifted ? 7 : 12,
          paddingLeft: 12,
          paddingRight: children ? 40 : 12,
          background: "#ffffff",
          border: `1px solid ${focused ? "#0075de" : "rgba(0,0,0,0.12)"}`,
          borderRadius: 6,
          color: "rgba(0,0,0,0.9)",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          letterSpacing: "-0.006em",
          boxSizing: "border-box",
          outline: "none",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          boxShadow: focused ? "0 0 0 3px rgba(0,117,222,0.16)" : "none",
        }}
      />
      {children && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Floating label password ────────────────────────────────────────────────────
function FloatPassword({ label, value, onChange, showStrength }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  const strength = passwordStrength(value);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ position: "relative" }}>
        <label style={{
          position: "absolute", left: 12, zIndex: 1, pointerEvents: "none",
          top: lifted ? 7 : "50%",
          transform: lifted ? "none" : "translateY(-50%)",
          fontSize: lifted ? 10 : 14,
          fontWeight: lifted ? 600 : 400,
          letterSpacing: lifted ? "0.04em" : "-0.006em",
          textTransform: lifted ? "uppercase" : "none",
          color: focused ? "rgba(0,0,0,0.7)" : "#a39e98",
          fontFamily: "var(--font-ui)",
          transition: "all 0.15s cubic-bezier(0.23,1,0.32,1)",
        }}>{label}</label>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="new-password"
          placeholder={focused ? "••••••••" : ""}
          style={{
            width: "100%",
            paddingTop: lifted ? 19 : 12,
            paddingBottom: lifted ? 7 : 12,
            paddingLeft: 12,
            paddingRight: 40,
            background: "#ffffff",
            border: `1px solid ${focused ? "#0075de" : "rgba(0,0,0,0.12)"}`,
            borderRadius: 6,
            color: "rgba(0,0,0,0.9)",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            boxSizing: "border-box",
            outline: "none",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            boxShadow: focused ? "0 0 0 3px rgba(0,117,222,0.16)" : "none",
          }}
        />
        <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1} style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "#a39e98", padding: 0, display: "flex", transition: "color 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.color = "rgba(0,0,0,0.7)"}
          onMouseLeave={e => e.currentTarget.style.color = "#a39e98"}
        >
          {show
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
          }
        </button>
      </div>
      {/* Strength bar */}
      {showStrength && value && (
        <div style={{ marginTop: 6 }}>
          <div style={{ height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 9999, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 9999,
              width: `${(strength.level / 5) * 100}%`,
              background: strength.color,
              transition: "width 0.3s cubic-bezier(0.23,1,0.32,1), background 0.3s ease",
            }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: strength.color, fontFamily: "var(--font-ui)", fontWeight: 500 }}>
            {strength.label}
          </div>
          <PasswordRequirements pw={value} />
        </div>
      )}
    </div>
  );
}

// ── Primary button ─────────────────────────────────────────────────────────────
function PrimaryBtn({ onClick, loading, children }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: "100%", padding: "10px 16px",
      background: loading ? "rgba(0,0,0,0.06)" : "#0075de",
      color: loading ? "#a39e98" : "#ffffff",
      border: "none", borderRadius: 4,
      fontFamily: "var(--font-ui)", fontWeight: 600,
      fontSize: 14, letterSpacing: "-0.006em",
      cursor: loading ? "not-allowed" : "pointer",
      transition: "background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease",
      boxShadow: loading ? "none" : "rgba(0,0,0,0.1) 0px 1px 3px, rgba(0,117,222,0.15) 0px 2px 8px",
      marginTop: 6,
    }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#005bab"; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#0075de"; }}
      onMouseDown={e  => { if (!loading) e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={e    => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {loading ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <span style={{
            display: "inline-block", width: 12, height: 12, borderRadius: "50%",
            border: "2px solid rgba(0,0,0,0.12)", borderTopColor: "#a39e98",
            animation: "spin 0.7s linear infinite",
          }} />
          {children}
        </span>
      ) : children}
    </button>
  );
}

function LinkBtn({ children, onClick }) {
  return (
    <span onClick={onClick} style={{
      color: "#0075de", fontSize: 13, fontFamily: "var(--font-ui)",
      cursor: "pointer", fontWeight: 500, letterSpacing: "-0.006em",
      transition: "color 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.color = "#005bab"}
      onMouseLeave={e => e.currentTarget.style.color = "#0075de"}
    >{children}</span>
  );
}

function ErrMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 6, marginBottom: 12,
      background: "rgba(224,62,62,0.06)", border: "1px solid rgba(224,62,62,0.18)",
      color: "#e03e3e", fontSize: 12, fontFamily: "var(--font-ui)", lineHeight: 1.5,
      animation: "slideUp 0.18s cubic-bezier(0.23,1,0.32,1)",
    }}>{msg}</div>
  );
}
function OkMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 6, marginBottom: 12,
      background: "rgba(26,174,57,0.06)", border: "1px solid rgba(26,174,57,0.2)",
      color: "#1aae39", fontSize: 12, fontFamily: "var(--font-ui)", lineHeight: 1.5,
      animation: "slideUp 0.18s cubic-bezier(0.23,1,0.32,1)",
    }}>{msg}</div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
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
  const [resetToken]  = useState(initialResetToken  || "");
  const [inviteToken] = useState(initialInviteToken || "");
  const [inviteInfo,  setInviteInfo]  = useState(null);
  const [mfaPending,  setMfaPending]  = useState(null);
  const [mfaCode,     setMfaCode]     = useState("");
  const [useBackup,   setUseBackup]   = useState(false);
  const [formVisible, setFormVisible] = useState(true);

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
    setFormVisible(false);
    setTimeout(() => {
      setTab(t); setError(null); setSuccess(null);
      setName(""); setUsername(""); setEmail("");
      setPassword(""); setResetPw(""); setInvitePw("");
      setFormVisible(true);
    }, 120);
  }

  async function handleLogin() {
    if (!username || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Login failed."); return; }
      if (data.mfa_required) {
        setMfaPending({ mfa_token: data.mfa_token });
        setMfaCode(""); setUseBackup(false); setError(null); return;
      }
      onAuth(data.token, data.user);
    } catch { setError("Unable to connect. Please try again."); }
    finally  { setLoading(false); }
  }

  async function handleMfaVerify() {
    if (!mfaCode.trim()) { setError("Enter your authentication code."); return; }
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

  async function handleForgot() {
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true); setError(null);
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
    if (!resetPw) { setError("Enter a new password."); return; }
    const pwErr = validatePassword(resetPw);
    if (pwErr) { setError(pwErr); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, new_password: resetPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Reset failed."); return; }
      setSuccess("Password updated! You can now sign in.");
      setTimeout(() => switchTab("login"), 2500);
    } catch { setError("Unable to connect. Please try again."); }
    finally  { setLoading(false); }
  }

  async function handleAcceptInvite() {
    if (!name || !username || !invitePw) { setError("All fields are required."); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters."); return; }
    const pwErr = validatePassword(invitePw);
    if (pwErr) { setError(pwErr); return; }
    setLoading(true); setError(null);
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

  function renderLogin() {
    return (
      <div onKeyDown={e => e.key === "Enter" && handleLogin()}>
        <FloatInput label="Username" value={username} onChange={setUsername} autoFocus />
        <FloatPassword label="Password" value={password} onChange={setPassword} />
        <div style={{ textAlign: "right", marginTop: -4, marginBottom: 14 }}>
          <LinkBtn onClick={() => switchTab("forgot")}>Forgot password?</LinkBtn>
        </div>
        <ErrMsg msg={error} /><OkMsg msg={success} />
        <PrimaryBtn onClick={handleLogin} loading={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </PrimaryBtn>
      </div>
    );
  }

  function renderForgot() {
    return (
      <div onKeyDown={e => e.key === "Enter" && handleForgot()}>
        <p style={{ color: "#615d59", fontSize: 13, fontFamily: "var(--font-ui)", lineHeight: 1.6, marginBottom: 18, marginTop: 0, letterSpacing: "-0.006em" }}>
          Enter your email and we'll send a reset link if that account exists.
        </p>
        <FloatInput label="Email address" type="email" value={email} onChange={setEmail} autoFocus />
        <ErrMsg msg={error} /><OkMsg msg={success} />
        <PrimaryBtn onClick={handleForgot} loading={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </PrimaryBtn>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <LinkBtn onClick={() => switchTab("login")}>← Back to sign in</LinkBtn>
        </div>
      </div>
    );
  }

  function renderReset() {
    return (
      <div onKeyDown={e => e.key === "Enter" && handleReset()}>
        <p style={{ color: "#615d59", fontSize: 13, fontFamily: "var(--font-ui)", lineHeight: 1.6, marginBottom: 18, marginTop: 0, letterSpacing: "-0.006em" }}>
          Choose a strong password for your account.
        </p>
        <FloatPassword label="New password" value={resetPw} onChange={setResetPw} showStrength />
        <ErrMsg msg={error} /><OkMsg msg={success} />
        <PrimaryBtn onClick={handleReset} loading={loading}>
          {loading ? "Updating…" : "Set new password"}
        </PrimaryBtn>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <LinkBtn onClick={() => switchTab("login")}>← Back to sign in</LinkBtn>
        </div>
      </div>
    );
  }

  function renderInvite() {
    return (
      <div onKeyDown={e => e.key === "Enter" && handleAcceptInvite()}>
        {inviteInfo && (
          <div style={{
            padding: "10px 12px", borderRadius: 6, marginBottom: 16,
            background: "rgba(0,117,222,0.05)", border: "1px solid rgba(0,117,222,0.15)",
            fontFamily: "var(--font-ui)", fontSize: 12, color: "#615d59", lineHeight: 1.6,
          }}>
            Invited as <strong style={{ color: "#0075de", textTransform: "capitalize" }}>{inviteInfo.role}</strong>
            {" · "}<strong style={{ color: "rgba(0,0,0,0.8)" }}>{inviteInfo.email}</strong>
          </div>
        )}
        <FloatInput label="Full name" value={name} onChange={setName} autoFocus />
        <FloatInput label="Username" value={username} onChange={setUsername} />
        <FloatPassword label="Password" value={invitePw} onChange={setInvitePw} showStrength />
        <ErrMsg msg={error} /><OkMsg msg={success} />
        <PrimaryBtn onClick={handleAcceptInvite} loading={loading}>
          {loading ? "Setting up…" : "Complete setup"}
        </PrimaryBtn>
      </div>
    );
  }

  function renderMfa() {
    return (
      <div>
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20,
          padding: "12px", borderRadius: 6,
          background: "rgba(0,117,222,0.05)", border: "1px solid rgba(0,117,222,0.14)",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0075de" strokeWidth="2" style={{ flexShrink:0, marginTop:1 }}>
            <rect x="5" y="11" width="14" height="10" rx="2"/>
            <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
          </svg>
          <span style={{ fontSize: 12, fontFamily: "var(--font-ui)", color: "#615d59", lineHeight: 1.5, letterSpacing: "-0.006em" }}>
            {useBackup ? "Enter one of your 8-character backup codes." : "Enter the 6-digit code from your authenticator app."}
          </span>
        </div>

        <label style={{
          display: "block", color: "#a39e98", fontSize: 10, fontWeight: 600,
          letterSpacing: "0.04em", marginBottom: 8, textTransform: "uppercase",
          fontFamily: "var(--font-ui)",
        }}>
          {useBackup ? "Backup code" : "Authenticator code"}
        </label>
        <input
          autoFocus
          type="text"
          inputMode={useBackup ? "text" : "numeric"}
          placeholder={useBackup ? "XXXXXXXX" : "000 000"}
          maxLength={useBackup ? 8 : 6}
          value={mfaCode}
          onChange={e => setMfaCode(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleMfaVerify()}
          style={{
            width: "100%", letterSpacing: "0.3em", textAlign: "center",
            fontSize: 28, fontFamily: "var(--font-mono)", fontWeight: 600,
            paddingTop: 16, paddingBottom: 16,
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 6, color: "rgba(0,0,0,0.9)", boxSizing: "border-box",
            outline: "none", marginBottom: 14,
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          }}
          onFocus={e => { e.target.style.borderColor = "#0075de"; e.target.style.boxShadow = "0 0 0 3px rgba(0,117,222,0.16)"; }}
          onBlur={e  => { e.target.style.borderColor = "rgba(0,0,0,0.12)"; e.target.style.boxShadow = "none"; }}
        />

        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <LinkBtn onClick={() => { setUseBackup(b => !b); setMfaCode(""); setError(null); }}>
            {useBackup ? "← Use authenticator app" : "Use a backup code instead"}
          </LinkBtn>
        </div>

        <ErrMsg msg={error} />
        <PrimaryBtn onClick={handleMfaVerify} loading={loading}>
          {loading ? "Verifying…" : "Verify identity"}
        </PrimaryBtn>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <LinkBtn onClick={() => { setMfaPending(null); setError(null); setMfaCode(""); }}>
            ← Back to sign in
          </LinkBtn>
        </div>
      </div>
    );
  }

  const isMfa = !!mfaPending;

  const headings = {
    login:  { title: "Sign in",         sub: "Welcome back to Vanguard" },
    forgot: { title: "Reset password",  sub: "We'll send a link to your email" },
    reset:  { title: "New password",    sub: "Choose a strong password" },
    invite: { title: "Create account",  sub: "Complete your team invitation" },
    mfa:    { title: "Verify identity", sub: "Two-factor authentication" },
  };
  const h = isMfa ? headings.mfa : headings[tab] || headings.login;

  const formContent = isMfa ? renderMfa()
    : tab === "login"  ? renderLogin()
    : tab === "forgot" ? renderForgot()
    : tab === "reset"  ? renderReset()
    : tab === "invite" ? renderInvite()
    : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f6f5f4",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{
        width: "100%", maxWidth: 400,
        animation: "floatIn 0.32s cubic-bezier(0.23,1,0.32,1) both",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, justifyContent: "center" }}>
          <img src="/favicon.svg" width={32} height={32} alt="Vanguard" />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "rgba(0,0,0,0.9)", letterSpacing: "-0.02em" }}>Vanguard</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#a39e98", letterSpacing: "-0.006em" }}>Cloud Security Platform</div>
          </div>
        </div>

        {/* Card — Notion whisper border + multi-layer shadow */}
        <div style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 12,
          padding: "28px 32px 32px",
          boxShadow: "rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.847px, rgba(0,0,0,0.02) 0px 0.8px 2.925px, rgba(0,0,0,0.01) 0px 0.175px 1.04px",
        }}>
          {/* Heading — Notion typography: negative letter-spacing, weight 700 */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{
              fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: 22, color: "rgba(0,0,0,0.9)",
              letterSpacing: "-0.03em", margin: "0 0 4px 0", lineHeight: 1.2,
            }}>{h.title}</h2>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#615d59", margin: 0, letterSpacing: "-0.006em", lineHeight: 1.5 }}>
              {h.sub}
            </p>
          </div>

          {/* Form — cross-fade between tabs */}
          <div style={{
            opacity: formVisible ? 1 : 0,
            transform: formVisible ? "translateY(0)" : "translateY(3px)",
            transition: "opacity 0.12s ease, transform 0.12s ease",
          }}>
            {formContent}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--font-ui)", fontSize: 11, color: "rgba(0,0,0,0.25)", letterSpacing: "-0.006em" }}>
          © 2025 Vanguard CSPM
        </div>
      </div>
    </div>
  );
}
