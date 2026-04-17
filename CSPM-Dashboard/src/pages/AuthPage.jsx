import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Password policy ───────────────────────────────────────────────────────────
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
    { label: "Uppercase letter (A–Z)",   met: /[A-Z]/.test(pw) },
    { label: "Lowercase letter (a–z)",   met: /[a-z]/.test(pw) },
    { label: "Special character (!@#…)", met: /[^A-Za-z0-9]/.test(pw) },
  ];
  if (!pw) return null;
  return (
    <div style={{ marginTop: 8, marginBottom: 4, display: "flex", flexDirection: "column", gap: 3 }}>
      {reqs.map(r => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "var(--font-ui)" }}>
          <span style={{ color: r.met ? "var(--green)" : "var(--accent3)", fontSize: 10 }}>{r.met ? "✓" : "○"}</span>
          <span style={{ color: r.met ? "var(--green)" : "var(--accent3)" }}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Password strength ─────────────────────────────────────────────────────────
function passwordStrength(pw) {
  if (!pw) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak",       color: "var(--red)"    };
  if (score <= 2) return { level: 2, label: "Fair",       color: "var(--orange)" };
  if (score <= 3) return { level: 3, label: "Good",       color: "var(--yellow)" };
  if (score <= 4) return { level: 4, label: "Strong",     color: "var(--green)"  };
  return               { level: 5, label: "Very strong", color: "var(--green)"  };
}

// ── Particle canvas — white dots on dark bg ───────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  const mouse     = useRef({ x: -9999, y: -9999 });
  const raf       = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    let W, H, dots = [];
    const SPACING = 44;
    const GLOW_R  = 180;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      dots = [];
      for (let x = SPACING / 2; x < W + SPACING; x += SPACING)
        for (let y = SPACING / 2; y < H + SPACING; y += SPACING)
          dots.push({ x, y, phase: Math.random() * Math.PI * 2, r: 0.6 + Math.random() * 0.6 });
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const { x: mx, y: my } = mouse.current;
      for (const d of dots) {
        const dist  = Math.hypot(d.x - mx, d.y - my);
        const near  = Math.max(0, 1 - dist / GLOW_R);
        const pulse = Math.sin(t * 0.0004 + d.phase) * 0.025;
        const alpha = 0.08 + near * 0.55 + pulse;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r + near * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }
      raf.current = requestAnimationFrame(draw);
    }

    resize();
    const onResize = () => resize();
    const onMove   = e => { mouse.current.x = e.clientX; mouse.current.y = e.clientY; };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    raf.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />
  );
}

// ── Floating label input — light enterprise style ────────────────────────────
function FloatInput({ label, type = "text", value, onChange, placeholder = "", autoFocus, children }) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <label style={{
        position: "absolute", left: 13, zIndex: 1, pointerEvents: "none",
        top: lifted ? 7 : "50%",
        transform: lifted ? "none" : "translateY(-50%)",
        fontSize: lifted ? 9 : 14,
        fontWeight: lifted ? 600 : 400,
        letterSpacing: lifted ? "0.08em" : "0.01em",
        textTransform: lifted ? "uppercase" : "none",
        color: focused ? "#111827" : "#94a3b8",
        fontFamily: "var(--font-ui)",
        transition: "all 0.18s cubic-bezier(0.23,1,0.32,1)",
        willChange: "top, font-size, transform",
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
          paddingTop: lifted ? 20 : 13,
          paddingBottom: lifted ? 7 : 13,
          paddingLeft: 13,
          paddingRight: children ? 44 : 13,
          background: "#ffffff",
          border: `1.5px solid ${focused ? "#111827" : "#e2e8f0"}`,
          borderRadius: 8,
          color: "#111827",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          boxSizing: "border-box",
          outline: "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: focused ? "0 0 0 3px rgba(0,0,0,0.12)" : "none",
        }}
      />
      {children && (
        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Floating label password — light enterprise style ──────────────────────────
function FloatPassword({ label, value, onChange, showStrength }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ position: "relative" }}>
        <label style={{
          position: "absolute", left: 13, zIndex: 1, pointerEvents: "none",
          top: lifted ? 7 : "50%",
          transform: lifted ? "none" : "translateY(-50%)",
          fontSize: lifted ? 9 : 14,
          fontWeight: lifted ? 600 : 400,
          letterSpacing: lifted ? "0.08em" : "0.01em",
          textTransform: lifted ? "uppercase" : "none",
          color: focused ? "#111827" : "#94a3b8",
          fontFamily: "var(--font-ui)",
          transition: "all 0.18s cubic-bezier(0.23,1,0.32,1)",
        }}>{label}</label>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={focused ? "••••••••" : ""}
          style={{
            width: "100%",
            paddingTop: lifted ? 20 : 13,
            paddingBottom: lifted ? 7 : 13,
            paddingLeft: 13,
            paddingRight: 44,
            background: "#ffffff",
            border: `1.5px solid ${focused ? "#111827" : "#e2e8f0"}`,
            borderRadius: 8,
            color: "#111827",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            boxSizing: "border-box",
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
            boxShadow: focused ? "0 0 0 3px rgba(0,0,0,0.12)" : "none",
          }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          tabIndex={-1}
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: "#94a3b8", padding: 0, display: "flex",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#111827"}
          onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
        >
          {show
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
          }
        </button>
      </div>
      {showStrength && <PasswordRequirements pw={value} />}
    </div>
  );
}

// ── Primary button — clean enterprise style ───────────────────────────────────
function PrimaryBtn({ onClick, loading, children }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: "100%", padding: "11px",
        background: loading ? "#e2e8f0" : "#111827",
        color: loading ? "#94a3b8" : "#ffffff",
        border: "none", borderRadius: 8,
        fontFamily: "var(--font-ui)", fontWeight: 600,
        fontSize: 14, letterSpacing: "0.01em",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "background 0.15s, box-shadow 0.15s",
        boxShadow: loading ? "none" : "0 1px 3px rgba(0,0,0,0.3)",
        marginTop: 4,
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#1f2937"; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#111827"; }}
    >
      {loading ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <span style={{
            display: "inline-block", width: 13, height: 13, borderRadius: "50%",
            border: "2px solid #cbd5e1", borderTopColor: "#475569",
            animation: "spin 0.7s linear infinite",
          }} />
          {children}
        </span>
      ) : children}
    </button>
  );
}

// ── Link-style button ─────────────────────────────────────────────────────────
function LinkBtn({ children, onClick, accent }) {
  return (
    <span
      onClick={onClick}
      style={{
        color: accent ? "#111827" : "#64748b",
        fontSize: 13, fontFamily: "var(--font-ui)",
        cursor: "pointer", fontWeight: accent ? 600 : 400,
        transition: "color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.color = "#1f2937"}
      onMouseLeave={e => e.currentTarget.style.color = accent ? "#111827" : "#64748b"}
    >{children}</span>
  );
}

// ── Error / success banners ───────────────────────────────────────────────────
function ErrMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, marginBottom: 14,
      background: "#fef2f2", border: "1px solid #fecaca",
      color: "#dc2626", fontSize: 12, fontFamily: "var(--font-ui)",
      animation: "slideUp 0.2s cubic-bezier(0.23,1,0.32,1)",
    }}>{msg}</div>
  );
}
function OkMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, marginBottom: 14,
      background: "#f0fdf4", border: "1px solid #bbf7d0",
      color: "#16a34a", fontSize: 12, fontFamily: "var(--font-ui)",
      animation: "slideUp 0.2s cubic-bezier(0.23,1,0.32,1)",
    }}>{msg}</div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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

  // Entrance + form cross-fade
  const [cardVisible, setCardVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(true);

  // Card tilt
  const cardRef = useRef(null);
  const tiltRAF = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setCardVisible(true), 60);
    return () => clearTimeout(timer);
  }, []);

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

  // Card tilt effect
  function onCardMouseMove(e) {
    cancelAnimationFrame(tiltRAF.current);
    tiltRAF.current = requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const rx = ((e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)) * -3.5;
      const ry = ((e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)) *  3.5;
      card.style.transition = "transform 0.08s ease-out";
      card.style.transform  = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
  }
  function onCardMouseLeave() {
    cancelAnimationFrame(tiltRAF.current);
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "transform 0.6s cubic-bezier(0.23,1,0.32,1)";
    card.style.transform  = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
  }

  function switchTab(t) {
    setFormVisible(false);
    setTimeout(() => {
      setTab(t);
      setError(null); setSuccess(null);
      setName(""); setUsername(""); setEmail("");
      setPassword(""); setResetPw(""); setInvitePw("");
      setFormVisible(true);
    }, 130);
  }

  // ── API calls ──────────────────────────────────────────────────────────────

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
        setMfaCode(""); setUseBackup(false); setError(null);
        return;
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
    if (!resetToken) { setError("Missing reset token. Use the link from your email."); return; }
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
    if (!inviteToken) { setError("Missing invite token."); return; }
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

  // ── Form renderers ─────────────────────────────────────────────────────────

  function renderLogin() {
    return (
      <div onKeyDown={e => e.key === "Enter" && handleLogin()}>
        <FloatInput label="Username" value={username} onChange={setUsername} autoFocus />
        <FloatPassword label="Password" value={password} onChange={setPassword} />
        <div style={{ textAlign: "right", marginTop: -2, marginBottom: 16 }}>
          <LinkBtn onClick={() => switchTab("forgot")}>Forgot password?</LinkBtn>
        </div>
        <ErrMsg msg={error} /><OkMsg msg={success} />
        <PrimaryBtn onClick={handleLogin} loading={loading}>
          {loading ? "Signing in…" : "Sign In →"}
        </PrimaryBtn>
      </div>
    );
  }

  function renderForgot() {
    return (
      <div onKeyDown={e => e.key === "Enter" && handleForgot()}>
        <p style={{ color: "#64748b", fontSize: 13, fontFamily: "var(--font-ui)", lineHeight: 1.6, marginBottom: 20, marginTop: 0 }}>
          Enter your email and we'll send a reset link if that account exists.
        </p>
        <FloatInput label="Email" type="email" value={email} onChange={setEmail} autoFocus />
        <ErrMsg msg={error} /><OkMsg msg={success} />
        <PrimaryBtn onClick={handleForgot} loading={loading}>
          {loading ? "Sending…" : "Send Reset Link →"}
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
        <p style={{ color: "#64748b", fontSize: 13, fontFamily: "var(--font-ui)", lineHeight: 1.6, marginBottom: 20, marginTop: 0 }}>
          Enter your new password below.
        </p>
        <FloatPassword label="New Password" value={resetPw} onChange={setResetPw} showStrength />
        <ErrMsg msg={error} /><OkMsg msg={success} />
        <PrimaryBtn onClick={handleReset} loading={loading}>
          {loading ? "Updating…" : "Set New Password →"}
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
            padding: "10px 14px", borderRadius: 8, marginBottom: 18,
            background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.18)",
            fontFamily: "var(--font-ui)", fontSize: 12, color: "#475569", lineHeight: 1.6,
          }}>
            Invited as{" "}
            <strong style={{ color: "#111827", textTransform: "uppercase" }}>{inviteInfo.role}</strong>
            {" "}for{" "}
            <strong style={{ color: "#111827" }}>{inviteInfo.email}</strong>
          </div>
        )}
        <FloatInput label="Full Name" value={name} onChange={setName} autoFocus />
        <FloatInput label="Username" value={username} onChange={setUsername} />
        <FloatPassword label="Password" value={invitePw} onChange={setInvitePw} showStrength />
        <ErrMsg msg={error} /><OkMsg msg={success} />
        <PrimaryBtn onClick={handleAcceptInvite} loading={loading}>
          {loading ? "Setting up…" : "Complete Setup →"}
        </PrimaryBtn>
      </div>
    );
  }

  function renderMfa() {
    return (
      <div>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
          padding: "12px 14px", borderRadius: 8,
          background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.15)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2">
            <rect x="5" y="11" width="14" height="10" rx="2"/>
            <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
          </svg>
          <span style={{ fontSize: 12, fontFamily: "var(--font-ui)", color: "#475569", lineHeight: 1.5 }}>
            {useBackup ? "Enter one of your 8-character backup codes." : "Enter the 6-digit code from your authenticator app."}
          </span>
        </div>

        <label style={{
          display: "block", color: "#94a3b8", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.12em", marginBottom: 8, textTransform: "uppercase",
          fontFamily: "var(--font-ui)",
        }}>
          {useBackup ? "Backup Code" : "Authenticator Code"}
        </label>
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
            width: "100%", letterSpacing: "0.4em", textAlign: "center",
            fontSize: 28, fontFamily: "var(--font-mono)", fontWeight: 600,
            paddingTop: 16, paddingBottom: 16,
            background: "#ffffff",
            border: "1.5px solid #e2e8f0",
            borderRadius: 8, color: "#111827", boxSizing: "border-box",
            outline: "none", marginBottom: 14,
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={e => { e.target.style.borderColor = "#111827"; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.12)"; }}
          onBlur={e  => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
        />

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <LinkBtn onClick={() => { setUseBackup(b => !b); setMfaCode(""); setError(null); }}>
            {useBackup ? "← Use authenticator app instead" : "Use a backup code instead"}
          </LinkBtn>
        </div>

        <ErrMsg msg={error} />
        <PrimaryBtn onClick={handleMfaVerify} loading={loading}>
          {loading ? "Verifying…" : "Verify Identity →"}
        </PrimaryBtn>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <LinkBtn onClick={() => { setMfaPending(null); setError(null); setMfaCode(""); }}>
            ← Back to sign in
          </LinkBtn>
        </div>
      </div>
    );
  }

  // ── Determine what to render ───────────────────────────────────────────────

  const isMfa = !!mfaPending;

  const formTitle =
    isMfa              ? "Verify Identity"
    : tab === "forgot" ? "Reset Password"
    : tab === "reset"  ? "Set New Password"
    : tab === "invite" ? "Complete Setup"
    : null;

  const formContent =
    isMfa              ? renderMfa()
    : tab === "login"  ? renderLogin()
    : tab === "forgot" ? renderForgot()
    : tab === "reset"  ? renderReset()
    : tab === "invite" ? renderInvite()
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9fafb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      {/* Centered card */}
      <div style={{
        width: "100%", maxWidth: 420,
        animation: "floatIn 0.35s cubic-bezier(0.23,1,0.32,1) both",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, justifyContent: "center" }}>
          <img src="/favicon.svg" width={36} height={36} alt="Vanguard" />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#111827", letterSpacing: "0.01em" }}>VANGUARD</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#9ca3af", letterSpacing: "0.1em" }}>// CSPM</div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "32px 36px 36px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        }}>
          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{
              fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: 20, color: "#111827",
              letterSpacing: "-0.02em", margin: "0 0 5px 0",
            }}>
              {isMfa ? "Verify identity" : tab === "forgot" ? "Reset password" : tab === "reset" ? "Set new password" : tab === "invite" ? "Complete setup" : "Sign in"}
            </h2>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#6b7280", margin: 0 }}>
              {isMfa ? "Enter your 6-digit authenticator code"
               : tab === "login"  ? "Sign in to your Vanguard account"
               : tab === "forgot" ? "We'll send a reset link to your email"
               : tab === "reset"  ? "Choose a strong password"
               : "Create your Vanguard account"}
            </p>
          </div>

          {/* Form content */}
          <div style={{
            opacity: formVisible ? 1 : 0,
            transform: formVisible ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 0.15s, transform 0.15s",
          }}>
            {formContent}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--font-mono)", fontSize: 10, color: "#d1d5db", letterSpacing: "0.06em" }}>
          © 2025 Vanguard CSPM · Enterprise Edition
        </div>
      </div>
    </div>
  );
}
