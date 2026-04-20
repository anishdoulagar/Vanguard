/**
 * TeamsPage — Team management.
 * Superadmin: full CRUD on teams + manage any team's members.
 * Admin: view their teams, add/remove members from teams they belong to.
 */
import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const S = {
  card: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", padding: "20px 24px",
  },
  label: {
    display: "block", color: "var(--accent3)", fontSize: "10px",
    letterSpacing: "0.04em", marginBottom: 5, fontWeight: 600,
    textTransform: "uppercase", fontFamily: "var(--font-ui)",
  },
  input: {
    width: "100%", background: "var(--card)",
    border: "1px solid var(--border)", borderRadius: 6,
    padding: "9px 12px", color: "var(--accent)",
    fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "-0.006em",
    boxSizing: "border-box", outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
};

function RoleBadge({ role }) {
  const colors = {
    superadmin: { bg: "rgba(75,123,201,0.10)",  border: "rgba(75,123,201,0.25)",  color: "#4b7bc9" },
    admin:      { bg: "rgba(75,123,201,0.07)",   border: "rgba(75,123,201,0.18)",  color: "#5a6fa8" },
    analyst:    { bg: "rgba(58,138,96,0.09)",    border: "rgba(58,138,96,0.22)",   color: "#3a8a60" },
    viewer:     { bg: "rgba(0,0,0,0.04)",        border: "rgba(0,0,0,0.1)",        color: "var(--accent2)" },
  };
  const c = colors[role] || colors.viewer;
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
      letterSpacing: "0.01em", textTransform: "capitalize", fontFamily: "var(--font-ui)",
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
    }}>{role}</span>
  );
}

// ── Create Team Modal ─────────────────────────────────────────────────────────

function CreateTeamModal({ token, onCreated, onClose }) {
  const [name, setName]   = useState("");
  const [desc, setDesc]   = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim()) { setError("Team name is required."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/teams`, {
        method: "POST", headers: authHeaders(token),
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to create team."); return; }
      onCreated(data.team);
    } catch { setError("Network error."); }
    finally   { setLoading(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center",
      animation: "overlayIn 0.2s ease-out",
    }} onClick={onClose}>
      <div style={{
        ...S.card, width: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        animation: "modalIn 0.25s cubic-bezier(0.23,1,0.32,1)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
            Create Team
          </div>
          <div style={{ fontSize: 12, color: "var(--accent3)" }}>
            Teams scope cloud accounts and control which users can access them.
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Team Name</label>
          <input style={S.input} value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Platform Engineering" autoFocus />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Description <span style={{ opacity: 0.5 }}>(optional)</span></label>
          <input style={S.input} value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="What does this team own?" />
        </div>

        {error && (
          <div style={{
            padding: "9px 13px", borderRadius: "var(--radius)", marginBottom: 14,
            background: "rgba(224,85,85,0.08)", color: "var(--red)",
            border: "1px solid rgba(224,85,85,0.2)", fontSize: 12,
          }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 12 }} onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" style={{ padding: "8px 18px", fontSize: 12 }}
            onClick={submit} disabled={loading}>
            {loading ? "Creating…" : "Create Team"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────

function AddMemberModal({ token, team, allUsers, existingMemberIds, onAdded, onClose }) {
  const available = allUsers.filter(u => !existingMemberIds.has(String(u.id)));
  const [selectedId, setSelectedId] = useState(available[0]?.id || "");
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!selectedId) { setError("Select a user."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/teams/${team.id}/members`, {
        method: "POST", headers: authHeaders(token),
        body: JSON.stringify({ user_id: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to add member."); return; }
      onAdded(data.member);
    } catch { setError("Network error."); }
    finally   { setLoading(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center",
      animation: "overlayIn 0.2s ease-out",
    }} onClick={onClose}>
      <div style={{
        ...S.card, width: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        animation: "modalIn 0.25s cubic-bezier(0.23,1,0.32,1)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", marginBottom: 16 }}>
          Add Member to {team.name}
        </div>

        {available.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--accent3)", marginBottom: 16 }}>
            All users are already members of this team.
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Select User</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              style={{ ...S.input, cursor: "pointer" }}>
              {available.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name || u.username} ({u.email}) — {u.role}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div style={{
            padding: "9px 13px", borderRadius: "var(--radius)", marginBottom: 14,
            background: "rgba(224,85,85,0.08)", color: "var(--red)",
            border: "1px solid rgba(224,85,85,0.2)", fontSize: 12,
          }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 12 }} onClick={onClose}>
            Cancel
          </button>
          {available.length > 0 && (
            <button className="btn-primary" style={{ padding: "8px 18px", fontSize: 12 }}
              onClick={submit} disabled={loading}>
              {loading ? "Adding…" : "Add Member"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────

function TeamCard({ team, token, isSuperadmin, currentUserId, allUsers, onDeleted }) {
  const [expanded, setExpanded]         = useState(false);
  const [members, setMembers]           = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMember, setShowAddMember]   = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [removingId, setRemovingId]     = useState(null);

  async function loadMembers() {
    if (members !== null) return;
    setLoadingMembers(true);
    try {
      const res  = await fetch(`${API}/teams/${team.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMembers(data.members || []);
    } catch { setMembers([]); }
    finally  { setLoadingMembers(false); }
  }

  function toggle() {
    setExpanded(e => !e);
    if (!expanded) loadMembers();
  }

  async function removeMember(userId) {
    setRemovingId(userId);
    try {
      await fetch(`${API}/teams/${team.id}/members/${userId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(m => m.filter(x => String(x.user_id) !== String(userId)));
    } catch {}
    finally { setRemovingId(null); }
  }

  async function deleteTeam() {
    setDeleting(true);
    try {
      await fetch(`${API}/teams/${team.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted(team.id);
    } catch {}
    finally { setDeleting(false); setConfirmDelete(false); }
  }

  const memberIds = new Set((members || []).map(m => String(m.user_id)));

  return (
    <>
      <div style={{ ...S.card, animation: "fadeIn 0.25s ease-out" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {/* Team icon */}
          <div style={{
            width: 38, height: 38, borderRadius: "var(--radius)",
            background: "rgba(0,113,227,0.08)", border: "1px solid rgba(0,113,227,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--cyan)" strokeWidth="1.8">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>
              {team.name}
            </div>
            {team.description && (
              <div style={{ fontSize: 12, color: "var(--accent3)", marginTop: 2, lineHeight: 1.5 }}>
                {team.description}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "var(--accent3)" }}>
                <span style={{ color: "var(--accent2)", fontWeight: 600 }}>{team.member_count}</span>
                {" "}member{team.member_count !== 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: 11, color: "var(--accent3)" }}>
                <span style={{ color: "var(--accent2)", fontWeight: 600 }}>{team.account_count}</span>
                {" "}account{team.account_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button className="btn-ghost" style={{ padding: "5px 11px", fontSize: 11 }}
              onClick={toggle}>
              {expanded ? "Hide" : "Members"}
            </button>
            {isSuperadmin && !confirmDelete && (
              <button className="btn-danger" style={{ padding: "5px 11px", fontSize: 11 }}
                onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            )}
            {confirmDelete && (
              <>
                <button className="btn-danger" style={{ padding: "5px 11px", fontSize: 11 }}
                  onClick={deleteTeam} disabled={deleting}>
                  {deleting ? "…" : "Confirm"}
                </button>
                <button className="btn-ghost" style={{ padding: "5px 11px", fontSize: 11 }}
                  onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Members panel */}
        {expanded && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            {loadingMembers && (
              <div style={{ color: "var(--accent3)", fontSize: 12 }}>Loading members…</div>
            )}
            {!loadingMembers && members !== null && (
              <>
                {members.length === 0 && (
                  <div style={{ color: "var(--accent3)", fontSize: 12, marginBottom: 12 }}>
                    No members yet.
                  </div>
                )}
                {members.map(m => (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0", borderBottom: "1px solid var(--border)",
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "rgba(0,113,227,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 11, color: "var(--cyan)", flexShrink: 0,
                    }}>
                      {(m.name || m.email || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
                        {m.name || m.username}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--accent3)" }}>{m.email}</div>
                    </div>
                    <RoleBadge role={m.role} />
                    {/* Don't show Remove for self, or for admin/superadmin targets when caller is not superadmin */}
                    {String(m.user_id) !== currentUserId &&
                      (isSuperadmin || !["admin", "superadmin"].includes(m.role)) && (
                      <button className="btn-ghost" style={{ padding: "3px 9px", fontSize: 10 }}
                        onClick={() => removeMember(String(m.user_id))}
                        disabled={removingId === String(m.user_id)}>
                        {removingId === String(m.user_id) ? "…" : "Remove"}
                      </button>
                    )}
                  </div>
                ))}
                <button className="btn-ghost" style={{ marginTop: 12, padding: "6px 14px", fontSize: 11 }}
                  onClick={() => setShowAddMember(true)}>
                  + Add Member
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showAddMember && (
        <AddMemberModal
          token={token}
          team={team}
          allUsers={allUsers}
          existingMemberIds={memberIds}
          onAdded={m => {
            setMembers(prev => [...(prev || []), m]);
            setShowAddMember(false);
          }}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamsPage({ token, user }) {
  const isSuperadmin = user?.role === "superadmin";
  const [teams, setTeams]       = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [tRes, uRes] = await Promise.all([
        fetch(`${API}/teams`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [tData, uData] = await Promise.all([tRes.json(), uRes.json()]);
      setTeams(tData.teams || []);
      setAllUsers(uData.users || []);
    } catch (e) { setError("Failed to load teams."); }
    finally      { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (user?.role !== "superadmin" && user?.role !== "admin") return (
    <div style={{ padding: "60px 32px", textAlign: "center", color: "var(--accent3)",
                  fontFamily: "var(--font-ui)", fontSize: "13px", letterSpacing: "-0.006em" }}>
      <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.4 }}>⛔</div>
      Admin access required.
    </div>
  );

  return (
    <div style={{ padding: "28px 36px 52px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
            color: "rgba(0,0,0,0.9)", margin: 0, letterSpacing: "-0.03em", lineHeight: 1.2,
          }}>Teams</h1>
          <p style={{ fontSize: 13, color: "var(--accent3)", marginTop: 4, fontFamily: "var(--font-ui)", letterSpacing: "-0.006em" }}>
            {isSuperadmin
              ? "Create and manage teams. Each team scopes cloud accounts and members."
              : "Teams you belong to and their members."}
          </p>
        </div>
        {isSuperadmin && (
          <button className="btn-primary" style={{ padding: "9px 18px", fontSize: 12, fontWeight: 700 }}
            onClick={() => setShowCreate(true)}>
            + Create Team
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: 20,
          background: "rgba(224,85,85,0.08)", color: "var(--red)",
          border: "1px solid rgba(224,85,85,0.2)", fontSize: 13,
        }}>{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ color: "var(--accent3)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>
          Loading teams…
        </div>
      )}

      {/* Empty */}
      {!loading && teams.length === 0 && (
        <div style={{
          ...S.card, textAlign: "center", padding: "60px 40px",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent2)" strokeWidth="1.5" style={{ display: "block", margin: "0 auto" }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accent2)", marginBottom: 6 }}>
            {isSuperadmin ? "No teams yet" : "You're not in any teams"}
          </div>
          <div style={{ fontSize: 12, color: "var(--accent3)" }}>
            {isSuperadmin
              ? "Create a team to start scoping cloud accounts and assigning members."
              : "Contact your superadmin to be added to a team."}
          </div>
        </div>
      )}

      {/* Team cards */}
      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              token={token}
              isSuperadmin={isSuperadmin}
              currentUserId={String(user?.id)}
              allUsers={allUsers}
              onDeleted={id => setTeams(t => t.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Create team modal */}
      {showCreate && (
        <CreateTeamModal
          token={token}
          onCreated={t => { setTeams(prev => [...prev, t]); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
