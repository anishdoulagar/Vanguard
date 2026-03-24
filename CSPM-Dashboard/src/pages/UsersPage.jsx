/**
 * UsersPage — superadmin user management.
 * Create users (no password — setup link generated), change roles,
 * disable/enable, set expiry, delete.
 */
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ROLES = ["viewer", "analyst", "admin", "superadmin"];

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

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ token, onCreated, onClose }) {
  const [name,       setName]       = useState("");
  const [username,   setUsername]   = useState("");
  const [email,      setEmail]      = useState("");
  const [role,       setRole]       = useState("analyst");
  const [validUntil, setValidUntil] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [result,     setResult]     = useState(null); // after creation

  async function handleCreate() {
    if (!name || !username || !email) { setError("Name, username, and email are required."); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/admin/users`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, role, valid_until: validUntil || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to create user."); return; }
      setResult(data);
      onCreated(data.user);
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
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: 460,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>
            Create New User
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent3)", display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* After creation — show setup link */}
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
                User <strong>{result.user.name}</strong> created as <RoleBadge role={result.user.role} />
              </div>

              {result.email_sent ? (
                <div style={{
                  padding: "12px 16px", borderRadius: 8,
                  background: "rgba(123,140,222,0.08)", border: "1px solid rgba(123,140,222,0.25)",
                  fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--accent3)", lineHeight: 1.6,
                }}>
                  A password setup link was sent to <strong style={{ color: "var(--accent)" }}>{result.user.email}</strong>.
                  The user must set their own password before logging in.
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 12,
                    background: "rgba(217,123,58,0.08)", border: "1px solid rgba(217,123,58,0.25)",
                    fontFamily: "var(--font-ui)", fontSize: 12, color: "#d97b3a", lineHeight: 1.6,
                  }}>
                    SMTP is not configured — share this one-time setup link with the user manually.
                    It expires in 72 hours. <strong>You will not see this again.</strong>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>One-time Setup Link</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input readOnly value={result.setup_url} style={{ ...inp, flex: 1, fontSize: 11, color: "var(--accent3)" }} />
                      <button onClick={() => navigator.clipboard.writeText(result.setup_url)} style={{
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
              {/* Security note */}
              <div style={{
                padding: "10px 14px", borderRadius: 7, marginBottom: 20,
                background: "rgba(123,140,222,0.06)", border: "1px solid rgba(123,140,222,0.2)",
                fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--accent3)", lineHeight: 1.6,
              }}>
                No password is set by you — a secure setup link will be generated for the user to set their own password.
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Full Name</label>
                <input type="text" placeholder="Jane Smith" value={name}
                       onChange={e => setName(e.target.value)} style={inp} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Username</label>
                <input type="text" placeholder="janesmith" value={username}
                       onChange={e => setUsername(e.target.value)} style={inp} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Email Address</label>
                <input type="email" placeholder="jane@example.com" value={email}
                       onChange={e => setEmail(e.target.value)} style={inp} />
              </div>

              {/* Role picker */}
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Role</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ROLES.map(r => {
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

              {/* Valid until */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Access Expires (optional)</label>
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                       min={new Date().toISOString().split("T")[0]}
                       style={{ ...inp, colorScheme: "dark" }} />
                <div style={{ marginTop: 5, fontSize: 11, color: "var(--accent3)", fontFamily: "var(--font-ui)" }}>
                  Leave blank for permanent access.
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
                <button onClick={handleCreate} disabled={loading} style={{
                  flex: 2, padding: 10, borderRadius: 6, cursor: loading ? "not-allowed" : "pointer",
                  background: loading ? "rgba(123,140,222,0.4)" : "#7b8cde",
                  border: "none", color: "#111214",
                  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 12,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  {loading ? "Creating..." : "Create User →"}
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
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "var(--surface)", border: "1px solid rgba(224,85,85,0.4)",
        borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden",
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage({ token, currentUser }) {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // per-row state
  const [rowState, setRowState] = useState({});

  const headers = { Authorization: `Bearer ${token}` };

  async function loadUsers() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/admin/users`, { headers });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to load users."); return; }
      setUsers(data.users);
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

  function onUserCreated(newUser) {
    setUsers(us => [{ ...newUser, account_count: 0, scan_count: 0 }, ...us]);
    setRowState(s => ({
      ...s,
      [newUser.id]: { selectedRole: newUser.role, validUntil: "", updating: false, roleSuccess: "Created!", roleError: null, metaUpdating: false },
    }));
    setTimeout(() => setRowState(s => ({ ...s, [newUser.id]: { ...s[newUser.id], roleSuccess: null } })), 4000);
  }

  function onUserDeleted(id) {
    setDeleteTarget(null);
    setUsers(us => us.filter(u => u.id !== id));
  }

  if (loading) return (
    <div style={{ padding: 40, color: "var(--accent3)", fontFamily: "var(--font-ui)", fontSize: 13 }}>Loading users...</div>
  );
  if (error) return (
    <div style={{ padding: 40 }}>
      <div style={{ padding: "12px 16px", borderRadius: 8, maxWidth: 480, background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.25)", color: "#e05555", fontFamily: "var(--font-mono)", fontSize: 13 }}>{error}</div>
    </div>
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>

      {showCreate  && <CreateUserModal token={token} onCreated={onUserCreated} onClose={() => setShowCreate(false)} />}
      {deleteTarget && <DeleteConfirmModal user={deleteTarget} token={token} onDeleted={onUserDeleted} onClose={() => setDeleteTarget(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--accent)", margin: 0, letterSpacing: "0.04em" }}>
              User Management
            </h1>
          </div>
          <p style={{ color: "var(--accent3)", fontSize: 13, fontFamily: "var(--font-ui)", margin: 0 }}>
            {users.length} user{users.length !== 1 ? "s" : ""} — passwords are never visible to admins
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 18px", borderRadius: 7, cursor: "pointer",
          background: "rgba(123,140,222,0.15)", border: "1px solid rgba(123,140,222,0.4)",
          color: "#7b8cde", fontFamily: "var(--font-ui)", fontWeight: 700,
          fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(123,140,222,0.25)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(123,140,222,0.15)"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create User
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>

        {/* Column headers */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 160px 100px 180px 180px 130px",
          padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)",
        }}>
          {["USER", "ROLE", "STATUS", "ACCESS EXPIRES", "PERMISSIONS", "ACTIONS"].map(h => (
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
              display: "grid", gridTemplateColumns: "1fr 160px 100px 180px 180px 130px",
              padding: "14px 20px", alignItems: "center",
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
                {isSelf ? (
                  <span style={{ fontSize: 11, color: "#4caf7d", fontFamily: "var(--font-ui)" }}>Active</span>
                ) : (
                  <button onClick={() => toggleActive(u)} disabled={rs.metaUpdating} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                    border: `1px solid ${u.is_active ? "rgba(76,175,125,0.4)" : "rgba(224,85,85,0.4)"}`,
                    background: u.is_active ? "rgba(76,175,125,0.1)" : "rgba(224,85,85,0.1)",
                    color: u.is_active ? "#4caf7d" : "#e05555",
                    fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    transition: "all 0.15s",
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                    {u.is_active ? "Active" : "Disabled"}
                  </button>
                )}
              </div>

              {/* Valid until */}
              <div>
                {isSelf ? (
                  <span style={{ fontSize: 11, color: "var(--accent3)", fontFamily: "var(--font-ui)" }}>—</span>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="date" value={rs.validUntil ?? ""}
                           onChange={e => setRow(u.id, { validUntil: e.target.value })}
                           style={{
                             background: "var(--card)", border: "1px solid var(--border)",
                             borderRadius: 5, padding: "4px 8px",
                             color: expired ? "#e05555" : "var(--accent)",
                             fontFamily: "var(--font-mono)", fontSize: 11,
                             colorScheme: "dark", outline: "none",
                           }} />
                    {expiryChanged && (
                      <button onClick={() => applyValidUntil(u)} disabled={rs.metaUpdating} style={{
                        padding: "4px 8px", borderRadius: 5, border: "none", cursor: "pointer",
                        background: "rgba(123,140,222,0.6)", color: "#111214",
                        fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                      }}>Set</button>
                    )}
                  </div>
                )}
              </div>

              {/* Role change */}
              <div>
                {isSelf ? (
                  <RoleBadge role={u.role} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <select value={rs.selectedRole || u.role}
                            onChange={e => setRow(u.id, { selectedRole: e.target.value, roleSuccess: null, roleError: null })}
                            style={{
                              background: "var(--card)", border: "1px solid var(--border)",
                              borderRadius: 6, padding: "5px 8px",
                              color: ROLE_META[rs.selectedRole || u.role]?.color || "var(--accent)",
                              fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
                              letterSpacing: "0.06em", cursor: "pointer", outline: "none",
                              textTransform: "uppercase",
                            }}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {roleChanged && (
                      <button onClick={() => applyRole(u)} disabled={rs.updating} style={{
                        padding: "5px 10px", borderRadius: 5, border: "none", cursor: "pointer",
                        background: "rgba(123,140,222,0.8)", color: "#111214",
                        fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                      }}>{rs.updating ? "..." : "Save"}</button>
                    )}
                  </div>
                )}
                {rs.roleSuccess && <div style={{ fontSize: 10, color: "#4caf7d", fontFamily: "var(--font-ui)", marginTop: 3 }}>{rs.roleSuccess}</div>}
                {rs.roleError   && <div style={{ fontSize: 10, color: "#e05555", fontFamily: "var(--font-ui)", marginTop: 3 }}>{rs.roleError}</div>}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6 }}>
                {!isSelf && (
                  <button onClick={() => setDeleteTarget(u)} style={{
                    padding: "5px 10px", borderRadius: 5, cursor: "pointer",
                    background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.3)",
                    color: "#e05555", fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.06em", textTransform: "uppercase", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(224,85,85,0.18)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(224,85,85,0.08)"}
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
