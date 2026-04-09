/**
 * SetupPage — shown on first run when no users exist.
 * The account created here automatically becomes superadmin.
 */
import { useState, useEffect, useRef } from "react";

function DotGrid() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W, H, dots = [];
    const SPACING = 38, GLOW_R = 200;
    function resize() {
      W = canvas.width = window.innerWidth;
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
        const dist = Math.hypot(d.x - mx, d.y - my);
        const near = Math.max(0, 1 - dist / GLOW_R);
        const pulse = Math.sin(t * 0.0005 + d.phase) * 0.04;
        const alpha = (light ? 0.09 : 0.13) + near * 0.6 + pulse;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r + near * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,113,227,${alpha})`;
        ctx.fill();
      }
      raf.current = requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", e => { mouse.current.x = e.clientX; mouse.current.y = e.clientY; });
    raf.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function passwordStrength(pw) {
  if (!pw) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)          score++;
  if (pw.length >= 12)         score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak",        color: "var(--red)" };
  if (score <= 2) return { level: 2, label: "Fair",        color: "var(--orange)" };
  if (score <= 3) return { level: 3, label: "Good",        color: "var(--yellow)" };
  if (score <= 4) return { level: 4, label: "Strong",      color: "var(--green)" };
  return                { level: 5, label: "Very strong",  color: "var(--green)" };
}

function PasswordField({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  const str = passwordStrength(value);
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          placeholder="••••••••"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, paddingRight: 44 }}
          autoComplete="new-password"
        />
        <button type="button" onClick={() => setShow(s => !s)} style={eyeStyle} tabIndex={-1}>
          {show
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        </button>
      </div>
      {value && (
        <>
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: str.level >= i ? str.color : "var(--border)",
                transition: "background 0.2s",
              }} />
            ))}
          </div>
          <div style={{ fontSize: 10, marginTop: 5, color: str.color, fontFamily: "var(--font-ui)" }}>
            {str.label}
          </div>
        </>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block", color: "var(--accent3)", fontSize: "11px",
  letterSpacing: "0.08em", marginBottom: 6,
  fontFamily: "var(--font-ui)", fontWeight: 600, textTransform: "uppercase",
};
const inputStyle = {
  width: "100%", background: "var(--surface)",
  border: "1px solid var(--border)", borderRadius: "var(--radius)",
  padding: "11px 14px", color: "var(--accent)",
  fontFamily: "var(--font-mono)", fontSize: 13,
  boxSizing: "border-box", outline: "none",
};
const eyeStyle = {
  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer",
  color: "var(--accent3)", padding: 0, display: "flex", alignItems: "center",
};

export default function SetupPage({ onSetupComplete }) {
  const [name,     setName]     = useState("");
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleCreate() {
    if (!name || !username || !email || !password) { setError("All fields are required."); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to create account."); return; }
      onSetupComplete(data.token, data.user);
    } catch { setError("Cannot reach the backend. Is it running?"); }
    finally  { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "24px", position: "relative", overflow: "hidden",
    }}>
      <DotGrid />

      {/* Radial glow */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 400,
        background: "radial-gradient(ellipse, rgba(0,113,227,0.04) 0%, transparent 68%)",
        pointerEvents: "none", zIndex: 1,
      }} />

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 2,
        width: "100%", maxWidth: 440,
        background: "var(--card)",
        borderRadius: 18,
        boxShadow: "rgba(0,0,0,0.22) 3px 5px 30px 0px, rgba(0,0,0,0.5) 0 16px 60px 0px",
      }}>
        <div style={{ background: "var(--card)", borderRadius: 18, padding: "44px 40px" }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "rgba(0,113,227,0.12)", border: "1.5px solid rgba(0,113,227,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 16, letterSpacing: "0.1em", color: "var(--cyan)" }}>VANGUARD</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--accent3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Initial Setup</div>
            </div>
          </div>

          {/* First-time setup notice */}
          <div style={{
            padding: "10px 13px", borderRadius: 8, marginBottom: 28,
            background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.18)",
          }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--orange)", letterSpacing: "0.08em", marginBottom: 4 }}>
              FIRST-TIME SETUP
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--accent2)", lineHeight: 1.6 }}>
              No users exist yet. This account will become the{" "}
              <span style={{ color: "var(--magenta)", fontWeight: 700 }}>superadmin</span> with full platform control.
            </div>
          </div>

          {/* Superadmin badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 5, marginBottom: 24,
            background: "rgba(232,67,147,0.08)", border: "1px solid rgba(232,67,147,0.2)",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--magenta)" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--magenta)", letterSpacing: "0.1em" }}>SUPERADMIN</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Full Name</label>
            <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} autoComplete="name" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Username</label>
            <input type="text" placeholder="choose a username" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} autoComplete="username" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} autoComplete="email" />
          </div>
          <PasswordField label="Password" value={password} onChange={setPassword} />

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 16,
              background: "rgba(239,68,68,0.08)", color: "var(--red)",
              border: "1px solid rgba(239,68,68,0.2)",
              fontSize: 12, fontFamily: "var(--font-ui)",
            }}>{error}</div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            style={{
              width: "100%", padding: 13,
              background: loading ? "transparent" : "var(--cyan)",
              color: loading ? "var(--accent3)" : "#ffffff",
              border: loading ? "1px solid var(--border)" : "none",
              borderRadius: 8,
              fontFamily: "var(--font-ui)", fontWeight: 400, fontSize: 14,
              letterSpacing: "-0.224px", cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              boxShadow: !loading ? "rgba(0,113,227,0.22) 3px 5px 30px 0px" : "none",
            }}
          >
            {loading ? "Creating account..." : "Create Superadmin Account →"}
          </button>

        </div>
      </div>
    </div>
  );
}
