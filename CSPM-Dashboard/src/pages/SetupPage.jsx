/**
 * SetupPage — shown on first run when no users exist.
 * The account created here automatically becomes superadmin.
 */
import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function passwordStrength(pw) {
  if (!pw) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)          score++;
  if (pw.length >= 12)         score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak",        color: "#e05555" };
  if (score <= 2) return { level: 2, label: "Fair",        color: "#d97b3a" };
  if (score <= 3) return { level: 3, label: "Good",        color: "#c9a84c" };
  if (score <= 4) return { level: 4, label: "Strong",      color: "#4caf7d" };
  return                { level: 5, label: "Very strong",  color: "#4caf7d" };
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
  display: "block", color: "var(--accent3)", fontSize: "10px",
  letterSpacing: "0.12em", marginBottom: 6,
  fontFamily: "var(--font-ui)", fontWeight: 600, textTransform: "uppercase",
};
const inputStyle = {
  width: "100%", background: "var(--card)",
  border: "1px solid var(--border)", borderRadius: 7,
  padding: "10px 12px", color: "var(--accent)",
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
      minHeight: "100vh", display: "flex",
      background: "radial-gradient(ellipse at 30% 40%, rgba(0,212,255,0.06) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(255,0,122,0.04) 0%, transparent 50%), var(--bg)",
    }}>

      {/* ── Left panel ── */}
      <div style={{
        width: 420, flexShrink: 0,
        background: "var(--surface)", borderRight: "1px solid rgba(0,212,255,0.15)",
        display: "flex", flexDirection: "column",
        padding: "60px 48px",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900,
            color: "var(--cyan)", letterSpacing: "0.14em",
            textShadow: "var(--glow-cyan)",
          }}>VANGUARD</div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent3)",
            marginTop: 5, letterSpacing: "0.18em",
          }}>// CLOUD SECURITY POSTURE MANAGEMENT</div>
        </div>

        {/* Step indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 32,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--cyan)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12,
            boxShadow: "0 0 8px rgba(0,212,255,0.3)",
          }}>1</div>
          <div style={{ color: "var(--cyan)", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13,
                        textShadow: "0 0 8px rgba(0,212,255,0.4)" }}>
            Create Superadmin
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, opacity: 0.6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 12,
          }}>2</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-ui)", fontSize: 13 }}>
            Add Cloud Accounts
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 12,
          }}>3</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-ui)", fontSize: 13 }}>
            Run Your First Scan
          </div>
        </div>

        {/* Info box */}
        <div style={{
          marginTop: "auto",
          padding: "16px", borderRadius: 8,
          background: "rgba(224,113,58,0.08)", border: "1px solid rgba(224,113,58,0.25)",
        }}>
          <div style={{
            fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
            color: "#d97b3a", letterSpacing: "0.08em", marginBottom: 6,
          }}>FIRST-TIME SETUP</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
            No users exist yet. The account you create here will be the{" "}
            <span style={{ color: "#e07070", fontWeight: 700 }}>superadmin</span>
            {" "}— it has full control over users, roles, and platform settings.
          </div>
        </div>

      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "60px 40px",
      }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          <div style={{ marginBottom: 32 }}>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800,
              color: "var(--cyan)", margin: 0, letterSpacing: "0.06em",
              textShadow: "var(--glow-cyan)",
            }}>INITIALIZE SUPERADMIN</h1>
            <p style={{
              fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--accent3)",
              marginTop: 8, lineHeight: 1.6,
            }}>
              This will be the root account for your CSPM instance.
              You can create additional users and assign roles after setup.
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background: "var(--surface)", border: "1px solid rgba(0,212,255,0.2)",
            borderRadius: 12, padding: "32px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,212,255,0.04)",
          }}>
            {/* Superadmin badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 5, marginBottom: 24,
              background: "rgba(200,100,100,0.1)", border: "1px solid rgba(200,100,100,0.3)",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="#e07070" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style={{
                fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                color: "#e07070", letterSpacing: "0.1em",
              }}>SUPERADMIN</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text" placeholder="Your name"
                value={name} onChange={e => setName(e.target.value)}
                style={inputStyle} autoComplete="name"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text" placeholder="choose a username"
                value={username} onChange={e => setUsername(e.target.value)}
                style={inputStyle} autoComplete="username"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} autoComplete="email"
              />
            </div>

            <PasswordField label="Password" value={password} onChange={setPassword} />

            {error && (
              <div style={{
                padding: "9px 12px", borderRadius: 7, marginBottom: 16,
                background: "rgba(224,85,85,0.08)", color: "#e05555",
                border: "1px solid rgba(224,85,85,0.25)",
                fontSize: 12, fontFamily: "var(--font-mono)",
              }}>{error}</div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="neon-btn"
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              style={{
                width: "100%", padding: 13,
                background: "transparent",
                color: loading ? "rgba(0,212,255,0.4)" : "var(--cyan)",
                border: `1px solid ${loading ? "rgba(0,212,255,0.2)" : "var(--cyan)"}`,
                borderRadius: 7,
                fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13,
                letterSpacing: "0.1em", cursor: loading ? "not-allowed" : "pointer",
                textTransform: "uppercase", transition: "all 0.15s",
                boxShadow: loading ? "none" : "var(--glow-cyan)",
                textShadow: loading ? "none" : "0 0 8px rgba(0,212,255,0.6)",
              }}
            >
              {loading ? "Creating account..." : "Create Superadmin Account →"}
            </button>
          </div>

          <p style={{
            fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--accent3)",
            textAlign: "center", marginTop: 20, lineHeight: 1.6,
          }}>
            After setup, additional users can be invited and assigned roles
            (viewer, analyst, admin) from the admin panel.
          </p>

        </div>
      </div>
    </div>
  );
}
