import { useState } from "react";

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
    { label: "8+ characters",           met: pw.length >= 8 },
    { label: "Uppercase (A–Z)",          met: /[A-Z]/.test(pw) },
    { label: "Lowercase (a–z)",          met: /[a-z]/.test(pw) },
    { label: "Special character (!@#…)", met: /[^A-Za-z0-9]/.test(pw) },
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

function FloatInput({ label, type = "text", value, onChange, autoFocus, autoComplete }) {
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
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        style={{
          width: "100%",
          paddingTop: lifted ? 19 : 12,
          paddingBottom: lifted ? 7 : 12,
          paddingLeft: 12,
          paddingRight: 12,
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
    </div>
  );
}

function FloatPassword({ label, value, onChange }) {
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
      {value && (
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
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
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
      minHeight: "100vh",
      background: "#f6f5f4",
      display: "flex", alignItems: "center", justifyContent: "center",
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

        {/* Card */}
        <div style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 12,
          padding: "28px 32px 32px",
          boxShadow: "rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.847px, rgba(0,0,0,0.02) 0px 0.8px 2.925px, rgba(0,0,0,0.01) 0px 0.175px 1.04px",
        }}>
          {/* Setup badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 9999,
              background: "rgba(0,117,222,0.07)", border: "1px solid rgba(0,117,222,0.15)",
              color: "#0075de", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-ui)",
              letterSpacing: "0.01em",
            }}>
              <span style={{ fontSize: 8 }}>●</span>
              First-time setup
            </span>
          </div>

          <h2 style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: 22, color: "rgba(0,0,0,0.9)",
            letterSpacing: "-0.03em", margin: "0 0 4px 0", lineHeight: 1.2,
          }}>Create your account</h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#615d59", margin: "0 0 24px 0", letterSpacing: "-0.006em", lineHeight: 1.5 }}>
            This account will become the platform superadmin.
          </p>

          <FloatInput label="Full name"      value={name}     onChange={setName}     autoFocus autoComplete="name" />
          <FloatInput label="Username"       value={username} onChange={setUsername} autoComplete="username" />
          <FloatInput label="Email address"  type="email" value={email} onChange={setEmail} autoComplete="email" />
          <FloatPassword label="Password"   value={password} onChange={setPassword} />

          {error && (
            <div style={{
              padding: "10px 12px", borderRadius: 6, marginBottom: 12,
              background: "rgba(224,62,62,0.06)", border: "1px solid rgba(224,62,62,0.18)",
              color: "#e03e3e", fontSize: 12, fontFamily: "var(--font-ui)", lineHeight: 1.5,
              animation: "slideUp 0.18s cubic-bezier(0.23,1,0.32,1)",
            }}>{error}</div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            style={{
              width: "100%", padding: "10px 16px",
              background: loading ? "rgba(0,0,0,0.06)" : "#0075de",
              color: loading ? "#a39e98" : "#ffffff",
              border: "none", borderRadius: 4,
              fontFamily: "var(--font-ui)", fontWeight: 600,
              fontSize: 14, letterSpacing: "-0.006em",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s ease, transform 0.1s ease",
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
                  border: "2px solid rgba(0,0,0,0.1)", borderTopColor: "#a39e98",
                  animation: "spin 0.7s linear infinite",
                }} />
                Creating account…
              </span>
            ) : "Create superadmin account"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--font-ui)", fontSize: 11, color: "rgba(0,0,0,0.25)", letterSpacing: "-0.006em" }}>
          © 2025 Vanguard CSPM
        </div>
      </div>
    </div>
  );
}
