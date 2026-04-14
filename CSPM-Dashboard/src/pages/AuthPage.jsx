import { useState, useEffect, useRef } from "react";

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
  if (score <= 1) return { level: 1, label: "Weak",       color: "var(--red)"    };
  if (score <= 2) return { level: 2, label: "Fair",       color: "var(--orange)" };
  if (score <= 3) return { level: 3, label: "Good",       color: "var(--yellow)" };
  if (score <= 4) return { level: 4, label: "Strong",     color: "var(--green)"  };
  return               { level: 5, label: "Very strong", color: "var(--green)"  };
}

// ── Reactive dot grid canvas ──────────────────────────────────────────────────
function DotGrid() {
  const canvasRef = useRef(null);
  const mouse     = useRef({ x: -9999, y: -9999 });
  const raf       = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    let W, H, dots = [];
    const SPACING = 38;
    const GLOW_R  = 220;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      dots = [];
      for (let x = SPACING / 2; x < W + SPACING; x += SPACING)
        for (let y = SPACING / 2; y < H + SPACING; y += SPACING)
          dots.push({ x, y, phase: Math.random() * Math.PI * 2, r: 0.8 + Math.random() * 0.8 });
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const light = document.documentElement.dataset.theme === "light";
      const { x: mx, y: my } = mouse.current;
      for (const d of dots) {
        const dist  = Math.hypot(d.x - mx, d.y - my);
        const near  = Math.max(0, 1 - dist / GLOW_R);
        const pulse = Math.sin(t * 0.0005 + d.phase) * 0.04;
        const alpha = (light ? 0.09 : 0.13) + near * 0.6 + pulse;
        const r     = d.r + near * 1.8;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(27,97,201,${alpha})`;
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

// ── Floating label input ──────────────────────────────────────────────────────
function FloatInput({ label, type = "text", value, onChange, placeholder = "", autoFocus, children }) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div style={{ position: "relative", marginBottom: 16 }}>
      <label style={{
        position: "absolute", left: 14, zIndex: 1, pointerEvents: "none",
        top: lifted ? 7 : "50%",
        transform: lifted ? "none" : "translateY(-50%)",
        fontSize: lifted ? 9 : 13,
        fontWeight: 700,
        letterSpacing: lifted ? "0.1em" : "0.01em",
        textTransform: lifted ? "uppercase" : "none",
        color: focused ? "var(--cyan)" : "var(--accent3)",
        fontFamily: "var(--font-ui)",
        transition: "all 0.2s cubic-bezier(0.23,1,0.32,1)",
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
          paddingTop: lifted ? 22 : 14,
          paddingBottom: lifted ? 7 : 14,
          paddingLeft: 14,
          paddingRight: children ? 44 : 14,
          background: focused ? "rgba(27,97,201,0.03)" : "var(--card)",
          border: `1.5px solid ${focused ? "var(--cyan)" : "var(--border)"}`,
          borderRadius: 10,
          color: "var(--accent)",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          boxSizing: "border-box",
          outline: "none",
          transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
          boxShadow: focused ? "0 0 0 3px rgba(27,97,201,0.18)" : "rgba(0,0,0,0.32) 0px 0px 1px, rgba(0,0,0,0.04) 0px 1px 2px",
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

// ── Floating label password ───────────────────────────────────────────────────
function FloatPassword({ label, value, onChange, showStrength }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const strength = showStrength ? passwordStrength(value) : null;
  const lifted = focused || value.length > 0;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ position: "relative" }}>
        <label style={{
          position: "absolute", left: 14, zIndex: 1, pointerEvents: "none",
          top: lifted ? 7 : "50%",
          transform: lifted ? "none" : "translateY(-50%)",
          fontSize: lifted ? 9 : 13,
          fontWeight: 700,
          letterSpacing: lifted ? "0.1em" : "0.01em",
          textTransform: lifted ? "uppercase" : "none",
          color: focused ? "var(--cyan)" : "var(--accent3)",
          fontFamily: "var(--font-ui)",
          transition: "all 0.2s cubic-bezier(0.23,1,0.32,1)",
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
            paddingTop: lifted ? 22 : 14,
            paddingBottom: lifted ? 7 : 14,
            paddingLeft: 14,
            paddingRight: 44,
            background: focused ? "rgba(27,97,201,0.03)" : "var(--card)",
            border: `1.5px solid ${focused ? "var(--cyan)" : "var(--border)"}`,
            borderRadius: 10,
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            boxSizing: "border-box",
            outline: "none",
            transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
            boxShadow: focused ? "0 0 0 3px rgba(27,97,201,0.18)" : "rgba(0,0,0,0.32) 0px 0px 1px, rgba(0,0,0,0.04) 0px 1px 2px",
          }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          tabIndex={-1}
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--accent3)", padding: 0, display: "flex",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--accent3)"}
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
      {showStrength && value && (
        <div style={{ marginTop: 6, paddingLeft: 2 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                flex: 1, height: 2, borderRadius: 2,
                background: strength.level >= i ? strength.color : "rgba(255,255,255,0.07)",
                transition: "background 0.25s",
              }} />
            ))}
          </div>
          <div style={{ fontSize: 10, marginTop: 4, color: strength.color, fontFamily: "var(--font-ui)" }}>
            {strength.label}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Primary button with press feedback ───────────────────────────────────────
function PrimaryBtn({ onClick, loading, children }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        width: "100%", padding: "13px",
        background: loading ? "transparent" : "#1b61c9",
        color: loading ? "var(--accent3)" : "#ffffff",
        border: loading ? "1.5px solid var(--border)" : "none",
        borderRadius: 12,
        fontFamily: "var(--font-ui)", fontWeight: 500,
        fontSize: 14, letterSpacing: "0.08px",
        cursor: loading ? "not-allowed" : "pointer",
        transform: pressed && !loading ? "scale(0.98)" : "scale(1)",
        transition: "transform 0.12s cubic-bezier(0.23,1,0.32,1), box-shadow 0.2s",
        boxShadow: !loading && !pressed ? "rgba(0,0,0,0.32) 0px 0px 1px, rgba(45,127,249,0.32) 0px 2px 8px" : "none",
      }}
    >
      {loading ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <span style={{
            display: "inline-block", width: 12, height: 12, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.12)", borderTopColor: "var(--cyan)",
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
        color: accent ? "var(--cyan)" : "var(--accent3)",
        fontSize: 12, fontFamily: "var(--font-ui)",
        cursor: "pointer", fontWeight: accent ? 700 : 400,
        transition: "color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
      onMouseLeave={e => e.currentTarget.style.color = accent ? "var(--cyan)" : "var(--accent3)"}
    >{children}</span>
  );
}

// ── Error / success banners ───────────────────────────────────────────────────
function ErrMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, marginBottom: 14,
      background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.2)",
      color: "var(--red)", fontSize: 12, fontFamily: "var(--font-ui)",
      animation: "slideUp 0.2s cubic-bezier(0.23,1,0.32,1)",
    }}>{msg}</div>
  );
}
function OkMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8, marginBottom: 14,
      background: "rgba(76,175,125,0.08)", border: "1px solid rgba(76,175,125,0.2)",
      color: "var(--green)", fontSize: 12, fontFamily: "var(--font-ui)",
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
    if (resetPw.length < 8) { setError("Password must be at least 8 characters."); return; }
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
    if (invitePw.length < 8) { setError("Password must be at least 8 characters."); return; }
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
        <div style={{ textAlign: "right", marginTop: -4, marginBottom: 16 }}>
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
        <p style={{ color: "var(--accent3)", fontSize: 13, fontFamily: "var(--font-ui)", lineHeight: 1.6, marginBottom: 20, marginTop: 0 }}>
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
        <p style={{ color: "var(--accent3)", fontSize: 13, fontFamily: "var(--font-ui)", lineHeight: 1.6, marginBottom: 20, marginTop: 0 }}>
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
            background: "rgba(79,143,247,0.06)", border: "1px solid rgba(79,143,247,0.15)",
            fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--accent2)", lineHeight: 1.6,
          }}>
            Invited as{" "}
            <strong style={{ color: "var(--cyan)", textTransform: "uppercase" }}>{inviteInfo.role}</strong>
            {" "}for{" "}
            <strong style={{ color: "var(--accent)" }}>{inviteInfo.email}</strong>
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
          background: "rgba(0,188,212,0.05)", border: "1px solid rgba(0,188,212,0.14)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2">
            <rect x="5" y="11" width="14" height="10" rx="2"/>
            <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
          </svg>
          <span style={{ fontSize: 12, fontFamily: "var(--font-ui)", color: "var(--accent2)", lineHeight: 1.5 }}>
            {useBackup ? "Enter one of your 8-character backup codes." : "Enter the 6-digit code from your authenticator app."}
          </span>
        </div>

        <label style={{
          display: "block", color: "var(--accent3)", fontSize: 9, fontWeight: 700,
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
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            borderRadius: 10, color: "var(--accent)", boxSizing: "border-box",
            outline: "none", marginBottom: 14,
            transition: "border-color 0.18s, box-shadow 0.18s",
          }}
          onFocus={e => { e.target.style.borderColor = "var(--cyan)"; e.target.style.boxShadow = "0 0 0 3px rgba(27,97,201,0.18)"; }}
          onBlur={e  => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
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
      background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
      position: "relative", overflow: "hidden",
    }}>
      <DotGrid />

      {/* Scan line */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "100%", height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(27,97,201,0.07) 40%, rgba(27,97,201,0.07) 60%, transparent 100%)",
          animation: "scanLine 9s linear infinite",
        }} />
      </div>

      {/* Radial glow behind card */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 500,
        background: "radial-gradient(ellipse, rgba(27,97,201,0.06) 0%, transparent 68%)",
        pointerEvents: "none", zIndex: 1,
      }} />

      {/* Card — gradient-border wrapper */}
      <div
        ref={cardRef}
        onMouseMove={onCardMouseMove}
        onMouseLeave={onCardMouseLeave}
        style={{
          position: "relative", zIndex: 2,
          width: "100%", maxWidth: 420,
          background: "var(--card)",
          borderRadius: 18,
          boxShadow: "rgba(0,0,0,0.32) 0px 0px 1px, rgba(0,0,0,0.08) 0px 4px 16px, rgba(45,127,249,0.28) 0px 2px 12px",
          opacity: cardVisible ? 1 : 0,
          transform: cardVisible ? "translateY(0) perspective(1200px)" : "translateY(22px) perspective(1200px)",
          transition: "opacity 0.55s cubic-bezier(0.23,1,0.32,1), transform 0.55s cubic-bezier(0.23,1,0.32,1)",
          willChange: "transform, opacity",
        }}
      >
        <div style={{ background: "var(--card)", borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "44px 40px", display: "flex", flexDirection: "column" }}>

            {/* Logo */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 32,
              opacity: cardVisible ? 1 : 0,
              transition: "opacity 0.5s 0.1s",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(27,97,201,0.10)", border: "1.5px solid rgba(27,97,201,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)",
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, letterSpacing: "0.28px", color: "var(--accent)" }}>Vanguard</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--accent3)", letterSpacing: "0.14px" }}>CSPM Platform</div>
              </div>
            </div>

            {/* Title for sub-forms */}
            {formTitle && (
              <div style={{
                marginBottom: 22,
                opacity: cardVisible ? 1 : 0,
                transform: cardVisible ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.5s 0.12s, transform 0.5s 0.12s cubic-bezier(0.23,1,0.32,1)",
              }}>
                <h2 style={{
                  fontFamily: "var(--font-display)", fontWeight: 800,
                  fontSize: 19, color: "var(--accent)", letterSpacing: "0.01em", margin: 0,
                }}>{formTitle}</h2>
              </div>
            )}

            {/* Form cross-fade */}
            <div style={{
              opacity: formVisible ? 1 : 0,
              transform: formVisible ? "translateY(0)" : "translateY(5px)",
              transition: "opacity 0.13s ease-out, transform 0.13s ease-out",
            }}>
              {formContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
