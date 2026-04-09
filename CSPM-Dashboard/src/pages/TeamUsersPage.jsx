/**
 * TeamUsersPage — Admin view of users in their teams.
 * Shows all team members with role, status, and MFA visibility.
 * Read-only — team management is done in TeamsPage.
 */
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ROLE_META = {
  viewer:     { color: "#6ca86c", bg: "rgba(100,168,100,0.12)", border: "rgba(100,168,100,0.3)" },
  analyst:    { color: "#64a0dc", bg: "rgba(100,160,220,0.12)", border: "rgba(100,160,220,0.3)" },
  admin:      { color: "#7b8cde", bg: "rgba(123,140,222,0.12)", border: "rgba(123,140,222,0.3)" },
  superadmin: { color: "#e07070", bg: "rgba(200,100,100,0.12)", border: "rgba(200,100,100,0.3)" },
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

function MfaBadge({ enabled }) {
  return enabled ? (
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

// ── Avatar initial ──────────────────────────────────────────────────────────

function Avatar({ name, role }) {
  const m = ROLE_META[role] || ROLE_META.analyst;
  const initials = (name || "?").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
      background: m.bg, border: `1.5px solid ${m.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: m.color, fontSize: 11, fontWeight: 800,
      fontFamily: "var(--font-ui)", letterSpacing: "0.04em",
    }}>{initials}</div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamUsersPage({ token, currentUser }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState("");
  const [filterMfa, setFilterMfa] = useState("all"); // all | on | off

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      try {
        const res  = await fetch(`${API}/admin/team-users`, { headers });
        const data = await res.json();
        if (!res.ok) { setError(data.detail || "Failed to load team users."); return; }
        setUsers(data.users || []);
      } catch { setError("Cannot reach the backend."); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (u.name  || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role  || "").toLowerCase().includes(q);
    const matchMfa =
      filterMfa === "all" ? true :
      filterMfa === "on"  ? u.mfa_enabled :
      !u.mfa_enabled;
    return matchSearch && matchMfa;
  });

  const mfaOnCount  = users.filter(u => u.mfa_enabled).length;
  const mfaOffCount = users.filter(u => !u.mfa_enabled).length;

  if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") return (
    <div style={{ padding: "60px 32px", textAlign: "center", color: "var(--accent3)",
                  fontFamily: "var(--font-mono)", fontSize: "13px" }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>⛔</div>
      Admin access required.
    </div>
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800,
            color: "var(--accent)", margin: 0, letterSpacing: "0.04em",
          }}>My Team's Users</h1>
        </div>
        <p style={{ color: "var(--accent3)", fontSize: 13, fontFamily: "var(--font-ui)", margin: 0 }}>
          All members across your teams — manage team assignments in the Teams page
        </p>
      </div>

      {/* MFA summary cards */}
      {!loading && !error && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Members", value: users.length, color: "var(--accent)", border: "var(--border)" },
            { label: "MFA Enabled", value: mfaOnCount, color: "#4caf7d", border: "rgba(76,175,125,0.3)" },
            { label: "MFA Disabled", value: mfaOffCount, color: "#e07070", border: "rgba(224,100,100,0.3)" },
          ].map(c => (
            <div key={c.label} style={{
              background: "var(--card)", border: `1px solid ${c.border}`,
              borderRadius: 8, padding: "14px 20px", minWidth: 120,
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color, fontFamily: "var(--font-display)", lineHeight: 1 }}>
                {c.value}
              </div>
              <div style={{ fontSize: 10, color: "var(--accent3)", fontFamily: "var(--font-ui)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter */}
      {!loading && !error && users.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 7, padding: "8px 12px", color: "var(--accent)",
              fontFamily: "var(--font-mono)", fontSize: 12, outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "on", "off"].map(f => (
              <button key={f} onClick={() => setFilterMfa(f)} style={{
                padding: "7px 13px", borderRadius: 6, cursor: "pointer",
                fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                letterSpacing: "0.07em", textTransform: "uppercase", transition: "all 0.15s",
                background: filterMfa === f
                  ? (f === "on" ? "rgba(76,175,125,0.15)" : f === "off" ? "rgba(224,100,100,0.12)" : "rgba(123,140,222,0.15)")
                  : "transparent",
                border: filterMfa === f
                  ? (f === "on" ? "1px solid rgba(76,175,125,0.4)" : f === "off" ? "1px solid rgba(224,100,100,0.3)" : "1px solid rgba(123,140,222,0.3)")
                  : "1px solid var(--border)",
                color: filterMfa === f
                  ? (f === "on" ? "#4caf7d" : f === "off" ? "#e07070" : "#7b8cde")
                  : "var(--accent3)",
              }}>
                {f === "all" ? "All" : f === "on" ? "MFA On" : "MFA Off"}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ padding: 40, color: "var(--accent3)", fontFamily: "var(--font-ui)", fontSize: 13 }}>
          Loading team members...
        </div>
      )}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, maxWidth: 480, background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.25)", color: "#e05555", fontFamily: "var(--font-mono)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>

          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 140px 100px 80px 160px",
            padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)",
          }}>
            {["USER", "ROLE", "STATUS", "MFA", "JOINED"].map(h => (
              <div key={h} style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--accent3)", letterSpacing: "0.1em" }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: "28px 20px", color: "var(--accent3)", fontFamily: "var(--font-ui)", fontSize: 13 }}>
              {users.length === 0
                ? "You are not a member of any team yet. Ask a superadmin to add you to a team."
                : "No users match your search."}
            </div>
          )}

          {filtered.map((u, i) => {
            const isSelf   = u.id === currentUser?.id;
            const expired  = isExpired(u.valid_until);
            const inactive = !u.is_active;

            return (
              <div key={u.id} style={{
                display: "grid", gridTemplateColumns: "1fr 140px 100px 80px 160px",
                padding: "13px 20px", alignItems: "center",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                background: inactive ? "rgba(224,85,85,0.03)" : "transparent",
                opacity: inactive ? 0.75 : 1,
              }}>

                {/* User info */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={u.name} role={u.role} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                      {u.name || "—"}
                      {isSelf && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                          background: "rgba(123,140,222,0.15)", border: "1px solid rgba(123,140,222,0.3)", color: "#7b8cde", letterSpacing: "0.08em" }}>YOU</span>
                      )}
                      {expired && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                          background: "rgba(224,85,85,0.12)", border: "1px solid rgba(224,85,85,0.3)", color: "#e05555" }}>EXPIRED</span>
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent3)", marginTop: 2 }}>{u.email}</div>
                    {u.username && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent3)", opacity: 0.7 }}>@{u.username}</div>
                    )}
                  </div>
                </div>

                {/* Role */}
                <div><RoleBadge role={u.role} /></div>

                {/* Active status */}
                <div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 9px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                    fontFamily: "var(--font-ui)", letterSpacing: "0.06em", textTransform: "uppercase",
                    background: u.is_active ? "rgba(76,175,125,0.08)" : "rgba(224,85,85,0.08)",
                    border: `1px solid ${u.is_active ? "rgba(76,175,125,0.3)" : "rgba(224,85,85,0.3)"}`,
                    color: u.is_active ? "#4caf7d" : "#e05555",
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* MFA */}
                <div><MfaBadge enabled={u.mfa_enabled} /></div>

                {/* Joined */}
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--accent3)" }}>
                  {formatDate(u.created_at) || "—"}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
