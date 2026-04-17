/**
 * SetupPage — shown on first run when no users exist.
 * The account created here automatically becomes superadmin.
 */
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

// ── Floating label input — enterprise light style ─────────────────────────────
function FloatInput({ label, type = "text", value, onChange, autoFocus, autoComplete }) {
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
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={focused ? "" : ""}
        style={{
          width: "100%",
          paddingTop: lifted ? 20 : 13,
          paddingBottom: lifted ? 7 : 13,
          paddingLeft: 13,
          paddingRight: 13,
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
    </div>
  );
}

// ── Floating label password ────────────────────────────────────────────────────
function FloatPassword({ label, value, onChange }) {
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
          autoComplete="new-password"
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
      <PasswordRequirements pw={value} />
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
      background: "#f9fafb",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 20px",
    }}>
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
          background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12,
          padding: "32px 36px 36px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
              color: "#9ca3af", letterSpacing: "0.12em", textTransform: "uppercase",
            }}>First-time Setup</span>
          </div>
          <h2 style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: 20, color: "#111827",
            letterSpacing: "-0.02em", margin: "0 0 4px 0",
          }}>Create your account</h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#6b7280", margin: "0 0 28px 0" }}>
            This account will become the platform superadmin.
          </p>

          <FloatInput label="Full Name" value={name} onChange={setName} autoFocus autoComplete="name" />
          <FloatInput label="Username" value={username} onChange={setUsername} autoComplete="username" />
          <FloatInput label="Email Address" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <FloatPassword label="Password" value={password} onChange={setPassword} />

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 14,
              background: "#fef2f2", border: "1px solid #fecaca",
              color: "#dc2626", fontSize: 12, fontFamily: "var(--font-ui)",
              animation: "slideUp 0.2s cubic-bezier(0.23,1,0.32,1)",
            }}>{error}</div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            style={{
              width: "100%", padding: "11px",
              background: loading ? "#f3f4f6" : "#111827",
              color: loading ? "#9ca3af" : "#ffffff",
              border: "none", borderRadius: 8,
              fontFamily: "var(--font-ui)", fontWeight: 600,
              fontSize: 14, letterSpacing: "0.01em",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
              marginTop: 4,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#1f2937"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#111827"; }}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <span style={{
                  display: "inline-block", width: 13, height: 13, borderRadius: "50%",
                  border: "2px solid #d1d5db", borderTopColor: "#6b7280",
                  animation: "spin 0.7s linear infinite",
                }} />
                Creating account…
              </span>
            ) : "Create Superadmin Account →"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--font-mono)", fontSize: 10, color: "#d1d5db", letterSpacing: "0.06em" }}>
          © 2025 Vanguard CSPM · Enterprise Edition
        </div>
      </div>
    </div>
  );
}
