/**
 * UsersPage — superadmin user management.
 * Invite users by email (they set their own credentials), change roles,
 * disable/enable, set expiry, delete.
 */
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ROLES = ["viewer", "analyst", "admin", "superadmin"];

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
    <div style={{ marginTop: 6, marginBottom: 4, display: "flex", flexDirection: "column", gap: 3 }}>
      {reqs.map(r => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "var(--font-ui)" }}>
          <span style={{ color: r.met ? "var(--green)" : "var(--accent3)", fontSize: 10 }}>{r.met ? "✓" : "○"}</span>
          <span style={{ color: r.met ? "var(--green)" : "var(--accent3)" }}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

const ROLE_META = {
  viewer:     { color: "#6ca86c", bg: "rgba(100,168,100,0.12)", border: "rgba(100,168,100,0.3)",  desc: "Read-only" },
  analyst:    { color: "#64a0dc", bg: "rgba(100,160,220,0.12)", border: "rgba(100,160,220,0.3)",  desc: "Scan + findings" },
  admin:      { color: "#7b8cde", bg: "rgba(123,140,222,0.12)", border: "rgba(123,140,222,0.3)",  desc: "Accounts + alerts" },
  superadmin: { color: "#e07070", bg: "rgba(200,100,100,0.12)", border: "rgba(200,100,100,0.3)",  desc: "Full control" },
};

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.analyst;
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4,
      background: m.bg, border: `1px solid ${m.border}`,
      color: m.color, fontSize: 10, fontWeight: 700,
      fontFamily: "var(--font-ui)", letterSpacing: "0.08em", textTransform: "uppercase",
    }}>{role}</span>
  );
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isExpired(valid_until) {
  if (!valid_until) return false;
  return new Date(valid_until) < new Date();
}

// ── Invite User Modal ─────────────────────────────────────────────────────────

function InviteUserModal({ token, onClose }) {
  const [email,   setEmail]   = useState("");
  const [role,    setRole]    = useState("analyst");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [result,  setResult]  = useState(null);

  async function handleInvite() {
    if (!email) { setError("Email is required."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/admin/invite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to send invite."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally  { setLoading(false); }
  }

  const inp = {
    width: "100%", background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 7, padding: "9px 12px", color: "var(--accent)",
    fontFamily: "var(--font-mono)", fontSize: 13, boxSizing: "border-box", outline: "none",
  };
  const lbl = {
    display: "block", color: "var(--accent3)", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.12em", marginBottom: 6, textTransform: "uppercase",
    fontFamily: "var(--font-ui)",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      animation: "overlayIn 0.2s ease-out",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: 440,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden",
        animation: "modalIn 0.25s cubic-bezier(0.23, 1, 0.32, 1)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>
            Invite User
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent3)", display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {result ? (
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
                padding: "12px 16px", borderRadius: 8,
                background: "rgba(76,175,125,0.08)", border: "1px solid rgba(76,175,125,0.25)",
                color: "#4caf7d", fontFamily: "var(--font-ui)", fontSize: 13,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Invite sent for <strong>{result.email}</strong> as <RoleBadge role={result.role} />
              </div>

              {result.email_sent ? (
                <div style={{
                  padding: "12px 16px", borderRadius: 8,
                  background: "rgba(123,140,222,0.08)", border: "1px solid rgba(123,140,222,0.25)",
                  fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--accent3)", lineHeight: 1.6,
                }}>
                  An invitation email was sent to <strong style={{ color: "var(--accent)" }}>{result.email}</strong>.
                  The link expires in 72 hours. The user will set their own name, username, and password.
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 12,
                    background: "rgba(217,123,58,0.08)", border: "1px solid rgba(217,123,58,0.25)",
                    fontFamily: "var(--font-ui)", fontSize: 12, color: "#d97b3a", lineHeight: 1.6,
                  }}>
                    SMTP is not configured — share this one-time invite link manually.
                    It expires in 72 hours. <strong>You will not see this again.</strong>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>Invite Link</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input readOnly value={result.invite_url} style={{ ...inp, flex: 1, fontSize: 11, color: "var(--accent3)" }} />
                      <button onClick={() => navigator.clipboard.writeText(result.invite_url)} style={{
                        padding: "9px 14px", borderRadius: 7, border: "1px solid var(--border)",
                        background: "var(--card)", color: "var(--accent)", cursor: "pointer",
                        fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                      }}>Copy</button>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={onClose} style={{
                width: "100%", padding: 11, borderRadius: 7, cursor: "pointer",
                background: "rgba(123,140,222,0.15)", border: "1px solid rgba(123,140,222,0.3)",
                color: "#7b8cde", fontFamily: "var(--font-ui)", fontWeight: 700,
                fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
              }}>Done</button>
            </div>
          ) : (
            <>
              <div style={{
                padding: "10px 14px", borderRadius: 7, marginBottom: 20,
                background: "rgba(123,140,222,0.06)", border: "1px solid rgba(123,140,222,0.2)",
                fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--accent3)", lineHeight: 1.6,
              }}>
                The invited user will receive a link to set up their own name, username, and password.
                The link expires in 72 hours.
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Email Address</label>
                <input type="email" placeholder="jane@example.com" value={email}
                       onChange={e => setEmail(e.target.value)}
                       onKeyDown={e => e.key === "Enter" && handleInvite()}
                       style={inp} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Role</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ROLES.filter(r => r !== "superadmin").map(r => {
                    const m = ROLE_META[r]; const sel = role === r;
                    return (
                      <button key={r} onClick={() => setRole(r)} style={{
                        padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                        border: `1px solid ${sel ? m.border : "var(--border)"}`,
                        background: sel ? m.bg : "transparent",
                        color: sel ? m.color : "var(--accent3)",
                        fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 11,
                        letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s",
                      }}>{r}</button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: "var(--accent3)", fontFamily: "var(--font-ui)" }}>
                  {ROLE_META[role]?.desc}
                </div>
              </div>

              {error && (
                <div style={{
                  padding: "8px 12px", borderRadius: 6, marginBottom: 14,
                  background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.25)",
                  color: "#e05555", fontSize: 12, fontFamily: "var(--font-mono)",
                }}>{error}</div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} style={{
                  flex: 1, padding: 10, borderRadius: 6, cursor: "pointer",
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--accent3)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 12,
                }}>Cancel</button>
                <button onClick={handleInvite} disabled={loading} style={{
                  flex: 2, padding: 10, borderRadius: 6, cursor: loading ? "not-allowed" : "pointer",
                  background: loading ? "rgba(123,140,222,0.4)" : "#7b8cde",
                  border: "none", color: "#111214",
                  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 12,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  {loading ? "Sending..." : "Send Invite →"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({ user, token, onDeleted, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function confirm() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/admin/users/${user.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed."); return; }
      onDeleted(user.id);
    } catch { setError("Network error."); }
    finally  { setLoading(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 110,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      animation: "overlayIn 0.2s ease-out",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "var(--surface)", border: "1px solid rgba(224,85,85,0.4)",
        borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden",
        animation: "modalIn 0.25s cubic-bezier(0.23, 1, 0.32, 1)",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, color: "#e05555" }}>
            Delete User
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--accent3)", margin: "0 0 8px", lineHeight: 1.6 }}>
            Permanently delete <strong style={{ color: "var(--accent)" }}>{user.name}</strong> ({user.email})?
          </p>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#e05555", margin: "0 0 20px" }}>
            This will also delete all their accounts, scans, and findings. This cannot be undone.
          </p>
          {error && (
            <div style={{
              padding: "8px 12px", borderRadius: 6, marginBottom: 14,
              background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.25)",
              color: "#e05555", fontSize: 12, fontFamily: "var(--font-mono)",
            }}>{error}</div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: 10, borderRadius: 6, cursor: "pointer",
              background: "transparent", border: "1px solid var(--border)",
              color: "var(--accent3)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 12,
            }}>Cancel</button>
            <button onClick={confirm} disabled={loading} style={{
              flex: 1, padding: 10, borderRadius: 6, cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "rgba(224,85,85,0.3)" : "rgba(224,85,85,0.8)",
              border: "none", color: "#fff",
              fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 12,
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Team Manager Modal ────────────────────────────────────────────────────────

function TeamManagerModal({ targetUser, token, allTeams, onClose }) {
  const [memberTeamIds, setMemberTeamIds] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [busy, setBusy]                   = useState(null);

  // Load this user's current team memberships by checking each team
  useEffect(() => {
    async function load() {
      const ids = new Set();
      for (const t of allTeams) {
        try {
          const r = await fetch(`${API}/teams/${t.id}/members`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d = await r.json();
          if ((d.members || []).some(m => String(m.user_id) === String(targetUser.id))) {
            ids.add(t.id);
          }
        } catch {}
      }
      setMemberTeamIds(ids);
      setLoading(false);
    }
    load();
  }, [targetUser.id, token]);

  async function addToTeam(teamId) {
    setBusy(teamId);
    try {
      await fetch(`${API}/teams/${teamId}/members`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: String(targetUser.id) }),
      });
      setMemberTeamIds(s => new Set([...s, teamId]));
    } catch {}
    finally { setBusy(null); }
  }

  async function removeFromTeam(teamId) {
    setBusy(teamId);
    try {
      await fetch(`${API}/teams/${teamId}/members/${targetUser.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      setMemberTeamIds(s => { const n = new Set(s); n.delete(teamId); return n; });
    } catch {}
    finally { setBusy(null); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      animation: "overlayIn 0.2s ease-out",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: 460,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden",
        animation: "modalIn 0.25s cubic-bezier(0.23,1,0.32,1)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>
              Team Memberships
            </div>
            <div style={{ fontSize: 11, color: "var(--accent3)", marginTop: 2 }}>
              {targetUser.name} · {targetUser.email}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent3)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: 20, maxHeight: 400, overflowY: "auto" }}>
          {loading && <div style={{ color: "var(--accent3)", fontSize: 13 }}>Loading…</div>}
          {!loading && allTeams.length === 0 && (
            <div style={{ color: "var(--accent3)", fontSize: 13 }}>No teams exist yet. Create teams first.</div>
          )}
          {!loading && allTeams.map(t => {
            const isMember = memberTeamIds?.has(t.id);
            return (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 0", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: isMember ? "var(--green)" : "var(--border)",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>{t.name}</div>
                  {t.description && <div style={{ fontSize: 10, color: "var(--accent3)" }}>{t.description}</div>}
                </div>
                {isMember ? (
                  <button style={{
                    padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                    cursor: "pointer", border: "1px solid rgba(224,85,85,0.3)",
                    background: "rgba(224,85,85,0.08)", color: "var(--red)",
                  }} onClick={() => removeFromTeam(t.id)} disabled={busy === t.id}>
                    {busy === t.id ? "…" : "Remove"}
                  </button>
                ) : (
                  <button style={{
                    padding: "4px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                    cursor: "pointer", border: "1px solid rgba(0,113,227,0.3)",
                    background: "rgba(0,113,227,0.08)", color: "var(--cyan)",
                  }} onClick={() => addToTeam(t.id)} disabled={busy === t.id}>
                    {busy === t.id ? "…" : "Add"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "7px 16px", fontSize: 12, width: "100%" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// ── Reset Password Modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ targetUser, token, onClose }) {
  const [newPwd,    setNewPwd]    = useState("");
  const [confirmPwd,setConfirmPwd]= useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(false);

  async function handleReset() {
    if (!newPwd) { setError("Password is required."); return; }
    const pwErr = validatePassword(newPwd);
    if (pwErr) { setError(pwErr); return; }
    if (newPwd !== confirmPwd) { setError("Passwords do not match."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/admin/users/${targetUser.id}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to reset password."); return; }
      setSuccess(true);
    } catch { setError("Network error."); }
    finally  { setLoading(false); }
  }

  const inp = {
    width: "100%", background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 6, padding: "9px 12px", color: "var(--accent)",
    fontFamily: "var(--font-mono)", fontSize: 13, boxSizing: "border-box", outline: "none",
  };
  const lbl = {
    display: "block", color: "var(--accent3)", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase",
    fontFamily: "var(--font-ui)",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: 400,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>
              Reset Password
            </div>
            <div style={{ fontSize: 11, color: "var(--accent3)", marginTop: 2 }}>
              {targetUser.name} · {targetUser.email}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent3)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {success ? (
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
                padding: "12px 16px", borderRadius: 8,
                background: "rgba(76,175,125,0.08)", border: "1px solid rgba(76,175,125,0.25)",
                color: "#4caf7d", fontFamily: "var(--font-ui)", fontSize: 13,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Password reset successfully. The user must log in again.
              </div>
              <button onClick={onClose} style={{
                width: "100%", padding: 10, borderRadius: 6, cursor: "pointer",
                background: "rgba(123,140,222,0.15)", border: "1px solid rgba(123,140,222,0.3)",
                color: "#7b8cde", fontFamily: "var(--font-ui)", fontWeight: 700,
                fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
              }}>Done</button>
            </div>
          ) : (
            <>
              <div style={{
                padding: "10px 14px", borderRadius: 7, marginBottom: 18,
                background: "rgba(217,123,58,0.06)", border: "1px solid rgba(217,123,58,0.2)",
                fontFamily: "var(--font-ui)", fontSize: 12, color: "#d97b3a", lineHeight: 1.6,
              }}>
                This sets a new password for the user without requiring their current one.
                The user's existing sessions will remain valid until they expire.
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>New Password</label>
                <input type="password" placeholder="Min. 8 chars, uppercase, special" value={newPwd}
                       onChange={e => setNewPwd(e.target.value)} style={inp} />
                <PasswordRequirements pw={newPwd} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>Confirm Password</label>
                <input type="password" placeholder="Repeat password" value={confirmPwd}
                       onChange={e => setConfirmPwd(e.target.value)}
                       onKeyDown={e => e.key === "Enter" && handleReset()}
                       style={inp} />
              </div>

              {error && (
                <div style={{
                  padding: "8px 12px", borderRadius: 6, marginBottom: 14,
                  background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.25)",
                  color: "#e05555", fontSize: 12, fontFamily: "var(--font-mono)",
                }}>{error}</div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} style={{
                  flex: 1, padding: 10, borderRadius: 6, cursor: "pointer",
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--accent3)", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 12,
                }}>Cancel</button>
                <button onClick={handleReset} disabled={loading} style={{
                  flex: 2, padding: 10, borderRadius: 6,
                  cursor: loading ? "not-allowed" : "pointer",
                  background: loading ? "rgba(123,140,222,0.4)" : "rgba(123,140,222,0.8)",
                  border: "none", color: "#111214",
                  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 12,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>{loading ? "Resetting..." : "Reset Password"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage({ token, currentUser }) {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showInvite,  setShowInvite]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [teamTarget, setTeamTarget]   = useState(null);
  const [allTeams, setAllTeams]       = useState([]);

  // per-row state
  const [rowState, setRowState] = useState({});

  const headers = { Authorization: `Bearer ${token}` };

  async function loadUsers() {
    setLoading(true); setError(null);
    try {
      const [res, tRes] = await Promise.all([
        fetch(`${API}/admin/users`, { headers }),
        fetch(`${API}/teams`, { headers }),
      ]);
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to load users."); return; }
      setUsers(data.users);
      const td = await tRes.json();
      setAllTeams(td.teams || []);
      const init = {};
      data.users.forEach(u => {
        init[u.id] = {
          selectedRole:  u.role,
          validUntil:    u.valid_until ? u.valid_until.split("T")[0] : "",
          updating:      false,
          roleSuccess:   null,
          roleError:     null,
          metaUpdating:  false,
        };
      });
      setRowState(init);
    } catch { setError("Cannot reach the backend."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  function setRow(id, patch) {
    setRowState(s => ({ ...s, [id]: { ...s[id], ...patch } }));
  }

  async function applyRole(u) {
    const role = rowState[u.id]?.selectedRole;
    setRow(u.id, { updating: true, roleSuccess: null, roleError: null });
    try {
      const res  = await fetch(`${API}/admin/users/${u.id}/role`, {
        method: "PUT", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) { setRow(u.id, { updating: false, roleError: data.detail || "Failed." }); return; }
      setRow(u.id, { updating: false, roleSuccess: `Set to ${role}` });
      setUsers(us => us.map(x => x.id === u.id ? { ...x, role, is_admin: ["admin","superadmin"].includes(role) } : x));
      setTimeout(() => setRow(u.id, { roleSuccess: null }), 3000);
    } catch { setRow(u.id, { updating: false, roleError: "Network error." }); }
  }

  async function toggleActive(u) {
    const newActive = !u.is_active;
    setRow(u.id, { metaUpdating: true });
    try {
      const res = await fetch(`${API}/admin/users/${u.id}`, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (!res.ok) return;
      setUsers(us => us.map(x => x.id === u.id ? { ...x, is_active: newActive } : x));
    } catch {} finally { setRow(u.id, { metaUpdating: false }); }
  }

  async function applyValidUntil(u) {
    const val = rowState[u.id]?.validUntil;
    setRow(u.id, { metaUpdating: true });
    try {
      const res = await fetch(`${API}/admin/users/${u.id}`, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ valid_until: val || "" }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setUsers(us => us.map(x => x.id === u.id ? { ...x, valid_until: data.valid_until } : x));
    } catch {} finally { setRow(u.id, { metaUpdating: false }); }
  }

  function onUserDeleted(id) {
    setDeleteTarget(null);
    setUsers(us => us.filter(u => u.id !== id));
  }

  if (currentUser?.role !== "superadmin") return (
    <div style={{ padding: "60px 32px", textAlign: "center", color: "var(--accent3)",
                  fontFamily: "var(--font-mono)", fontSize: "13px" }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>⛔</div>
      Superadmin access required.
    </div>
  );
  if (loading) return (
    <div style={{ padding: 40, color: "var(--accent3)", fontFamily: "var(--font-ui)", fontSize: 13 }}>Loading users...</div>
  );
  if (error) return (
    <div style={{ padding: 40 }}>
      <div style={{ padding: "12px 16px", borderRadius: 8, maxWidth: 480, background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.25)", color: "#e05555", fontFamily: "var(--font-mono)", fontSize: 13 }}>{error}</div>
    </div>
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>

      {showInvite && <InviteUserModal token={token} onClose={() => setShowInvite(false)} />}
      {deleteTarget && <DeleteConfirmModal user={deleteTarget} token={token} onDeleted={onUserDeleted} onClose={() => setDeleteTarget(null)} />}
      {resetTarget && <ResetPasswordModal targetUser={resetTarget} token={token} onClose={() => setResetTarget(null)} />}
      {teamTarget && <TeamManagerModal targetUser={teamTarget} token={token} allTeams={allTeams} onClose={() => setTeamTarget(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--accent)", margin: 0, letterSpacing: "0.14px" }}>
              User Management
            </h1>
          </div>
          <p style={{ color: "var(--accent3)", fontSize: 13, fontFamily: "var(--font-ui)", margin: 0 }}>
            {users.length} user{users.length !== 1 ? "s" : ""} — invite users by email, they set their own credentials
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 18px", borderRadius: 12, cursor: "pointer",
          background: "#1b61c9", border: "none",
          color: "#ffffff", fontFamily: "var(--font-ui)", fontWeight: 500,
          fontSize: 13, letterSpacing: "0.14px", transition: "background 0.15s",
          boxShadow: "rgba(0,0,0,0.32) 0px 0px 1px, rgba(45,127,249,0.28) 0px 1px 3px",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#254fad"}
          onMouseLeave={e => e.currentTarget.style.background = "#1b61c9"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Invite User
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>

        {/* Column headers */}
        <div style={{
          display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1.4fr 1.4fr 0.8fr 2fr",
          padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)",
        }}>
          {["USER", "ROLE", "STATUS", "ACCESS EXPIRES", "PERMISSIONS", "MFA", "ACTIONS"].map(h => (
            <div key={h} style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--accent3)", letterSpacing: "0.1em" }}>{h}</div>
          ))}
        </div>

        {users.length === 0 && (
          <div style={{ padding: "24px 20px", color: "var(--accent3)", fontFamily: "var(--font-ui)", fontSize: 13 }}>No users found.</div>
        )}

        {users.map((u, i) => {
          const rs     = rowState[u.id] || {};
          const isSelf = u.id === currentUser?.id;
          const expired = isExpired(u.valid_until);
          const inactive = !u.is_active;
          const roleChanged = rs.selectedRole && rs.selectedRole !== u.role;
          const expiryChanged = rs.validUntil !== undefined && rs.validUntil !== (u.valid_until ? u.valid_until.split("T")[0] : "");

          return (
            <div key={u.id} style={{
              display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1.4fr 1.4fr 0.8fr 2fr",
              padding: "16px 20px", alignItems: "center",
              borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none",
              background: inactive ? "rgba(224,85,85,0.03)" : isSelf ? "rgba(123,140,222,0.04)" : "transparent",
              opacity: inactive ? 0.7 : 1,
            }}>

              {/* User info */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                  {u.name || "—"}
                  {isSelf && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(123,140,222,0.15)", border: "1px solid rgba(123,140,222,0.3)", color: "#7b8cde", letterSpacing: "0.08em" }}>YOU</span>}
                  {expired && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(224,85,85,0.12)", border: "1px solid rgba(224,85,85,0.3)", color: "#e05555" }}>EXPIRED</span>}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent3)", marginTop: 2 }}>{u.email}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--accent3)", marginTop: 1 }}>
                  Joined {formatDate(u.created_at)} · {u.account_count ?? 0} acct · {u.scan_count ?? 0} scans
                </div>
              </div>

              {/* Current role */}
              <div><RoleBadge role={u.role} /></div>

              {/* Active toggle */}
              <div>
                <button
                  onClick={() => !isSelf && toggleActive(u)}
                  disabled={isSelf || rs.metaUpdating}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 9px", borderRadius: 5,
                    cursor: isSelf ? "default" : "pointer",
                    border: `1px solid ${u.is_active ? "rgba(76,175,125,0.4)" : "rgba(224,85,85,0.4)"}`,
                    background: u.is_active ? "rgba(76,175,125,0.1)" : "rgba(224,85,85,0.1)",
                    color: u.is_active ? "#4caf7d" : "#e05555",
                    fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    opacity: isSelf ? 0.7 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                  {u.is_active ? "Active" : "Off"}
                </button>
              </div>

              {/* Valid until */}
              <div style={{ minWidth: 0 }}>
                {isSelf ? (
                  <span style={{ fontSize: 11, color: "var(--accent3)", fontFamily: "var(--font-ui)" }}>—</span>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input type="date" value={rs.validUntil ?? ""}
                           onChange={e => setRow(u.id, { validUntil: e.target.value })}
                           style={{
                             background: "var(--card)", border: "1px solid var(--border)",
                             borderRadius: 5, padding: "4px 6px",
                             color: expired ? "#e05555" : "var(--accent)",
                             fontFamily: "var(--font-mono)", fontSize: 10,
                             colorScheme: "dark", outline: "none",
                             width: "100%", maxWidth: 120, minWidth: 0,
                           }} />
                    {expiryChanged && (
                      <button onClick={() => applyValidUntil(u)} disabled={rs.metaUpdating} style={{
                        padding: "4px 7px", borderRadius: 5, border: "none", cursor: "pointer",
                        background: "rgba(123,140,222,0.6)", color: "#111214",
                        fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>Set</button>
                    )}
                  </div>
                )}
              </div>

              {/* Role change */}
              <div style={{ minWidth: 0 }}>
                {isSelf ? (
                  <RoleBadge role={u.role} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <select value={rs.selectedRole || u.role}
                            onChange={e => setRow(u.id, { selectedRole: e.target.value, roleSuccess: null, roleError: null })}
                            style={{
                              background: "var(--card)", border: "1px solid var(--border)",
                              borderRadius: 6, padding: "5px 6px",
                              color: ROLE_META[rs.selectedRole || u.role]?.color || "var(--accent)",
                              fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                              letterSpacing: "0.05em", cursor: "pointer", outline: "none",
                              textTransform: "uppercase", minWidth: 0, maxWidth: "100%",
                            }}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {roleChanged && (
                      <button onClick={() => applyRole(u)} disabled={rs.updating} style={{
                        padding: "5px 8px", borderRadius: 5, border: "none", cursor: "pointer",
                        background: "rgba(123,140,222,0.8)", color: "#111214",
                        fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>{rs.updating ? "…" : "Save"}</button>
                    )}
                  </div>
                )}
                {rs.roleSuccess && <div style={{ fontSize: 10, color: "#4caf7d", fontFamily: "var(--font-ui)", marginTop: 3 }}>{rs.roleSuccess}</div>}
                {rs.roleError   && <div style={{ fontSize: 10, color: "#e05555", fontFamily: "var(--font-ui)", marginTop: 3 }}>{rs.roleError}</div>}
              </div>

              {/* MFA status */}
              <div>
                {u.mfa_enabled ? (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.07em", textTransform: "uppercase",
                    background: "rgba(76,175,125,0.10)", border: "1px solid rgba(76,175,125,0.30)",
                    color: "#4caf7d",
                  }}>
                    <span style={{ fontSize: 7 }}>●</span> ON
                  </span>
                ) : (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.07em", textTransform: "uppercase",
                    background: "rgba(136,153,170,0.07)", border: "1px solid rgba(136,153,170,0.2)",
                    color: "var(--accent3)",
                  }}>
                    <span style={{ fontSize: 7 }}>○</span> OFF
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setTeamTarget(u)} style={{
                  padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                  background: "rgba(27,97,201,0.08)", border: "1px solid rgba(27,97,201,0.22)",
                  color: "var(--cyan)", fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600,
                  letterSpacing: "0.08px", transition: "all 0.15s", whiteSpace: "nowrap",
                }}>Teams</button>
                {!isSelf && (
                  <button onClick={() => setResetTarget(u)} style={{
                    padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                    background: "rgba(27,97,201,0.06)", border: "1px solid rgba(27,97,201,0.18)",
                    color: "var(--cyan)", fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600,
                    letterSpacing: "0.08px", transition: "all 0.15s", whiteSpace: "nowrap",
                  }}>Reset Pwd</button>
                )}
                {!isSelf && (
                  <button onClick={() => setDeleteTarget(u)} style={{
                    padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                    background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)",
                    color: "var(--red)", fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 600,
                    letterSpacing: "0.08px", transition: "all 0.15s", whiteSpace: "nowrap",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.14)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(220,38,38,0.07)"}
                  >Delete</button>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
