import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ACTION_COLOR = {
  login:            "#4caf7d",
  create_account:   "#00bcd4",
  delete_account:   "#e05555",
  scan_account:     "#4f8ff7",
  bulk_scan:        "#4f8ff7",
  delete_user:      "#e05555",
  change_user_role: "#d97b3a",
  create_custom_rule: "#00bcd4",
  delete_custom_rule: "#e05555",
  update_alert_settings: "#c9a84c",
};

const ACTION_LABELS = {
  login:            "LOGIN",
  create_account:   "ADD ACCOUNT",
  delete_account:   "DEL ACCOUNT",
  scan_account:     "SCAN",
  bulk_scan:        "BULK SCAN",
  delete_user:      "DEL USER",
  change_user_role: "ROLE CHANGE",
  create_custom_rule: "ADD RULE",
  delete_custom_rule: "DEL RULE",
  update_alert_settings: "ALERT CFG",
};

const ALL_ACTIONS = ["ALL", ...Object.keys(ACTION_LABELS)];

export default function AuditPage({ token, role }) {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [actionFilter, setAction] = useState("ALL");
  const [search, setSearch]       = useState("");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    fetch(`${API}/audit-log?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => { setError("Failed to load audit log."); setLoading(false); });
  }, [token]);

  const since = dateRange === "7"  ? Date.now() - 7  * 86400000
              : dateRange === "30" ? Date.now() - 30 * 86400000
              : dateRange === "90" ? Date.now() - 90 * 86400000
              : null;

  const filtered = logs.filter(l => {
    if (actionFilter !== "ALL" && l.action !== actionFilter) return false;
    if (since && new Date(l.created_at).getTime() < since) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.user_email || "").toLowerCase().includes(q)
          || (l.action || "").toLowerCase().includes(q)
          || (l.resource_name || "").toLowerCase().includes(q)
          || (l.ip_address || "").toLowerCase().includes(q);
    }
    return true;
  });

  const card = {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: "10px", padding: "24px",
  };

  const pill = (active) => ({
    padding: "5px 12px", borderRadius: "20px", fontSize: "11px",
    fontFamily: "var(--font-ui)", fontWeight: 700, letterSpacing: "0.08em",
    cursor: "pointer", border: "1px solid var(--border)",
    background: active ? "var(--cyan)" : "transparent",
    color: active ? "#0e0c09" : "var(--accent3)",
    transition: "all 0.15s",
  });

  if (role !== "superadmin" && role !== "admin") return (
    <div style={{ padding: "60px 32px", textAlign: "center", color: "var(--accent3)",
                  fontFamily: "var(--font-mono)", fontSize: "13px" }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>⛔</div>
      Admin access required.
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--accent3)",
                      fontFamily: "var(--font-ui)", fontWeight: 700, marginBottom: 6 }}>
          SECURITY
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "0.05em" }}>
          AUDIT LOG
        </h1>
        <p style={{ color: "var(--accent3)", fontSize: 13, marginTop: 6 }}>
          Record of all significant actions performed by users on this platform.
        </p>
      </div>

      {/* Filters */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search user, action, resource..."
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "7px 12px", color: "var(--accent)",
              fontFamily: "var(--font-mono)", fontSize: 12, width: 240,
            }}
          />

          {/* Date range */}
          <div style={{ display: "flex", gap: 6 }}>
            {[["all","ALL"],["7","7D"],["30","30D"],["90","90D"]].map(([v,l]) => (
              <button key={v} onClick={() => setDateRange(v)} style={pill(dateRange === v)}>{l}</button>
            ))}
          </div>

          {/* Action filter */}
          <select
            value={actionFilter}
            onChange={e => setAction(e.target.value)}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "7px 10px", color: "var(--accent)",
              fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.05em",
            }}
          >
            {ALL_ACTIONS.map(a => (
              <option key={a} value={a}>{a === "ALL" ? "ALL ACTIONS" : (ACTION_LABELS[a] || a)}</option>
            ))}
          </select>

          <span style={{ marginLeft: "auto", color: "var(--accent3)", fontSize: 11,
                         fontFamily: "var(--font-ui)" }}>
            {filtered.length} ENTRIES
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--accent3)" }}>Loading...</div>
        ) : error ? (
          <div style={{ color: "#e05555", padding: 20 }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--accent3)",
                        fontFamily: "var(--font-mono)", fontSize: 13 }}>
            No audit log entries found.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "160px 90px 120px 180px 1fr 110px",
                           gap: "0 16px", padding: "8px 0", borderBottom: "1px solid var(--border)",
                           marginBottom: 4 }}>
              {["TIMESTAMP","ACTION","RESOURCE","USER","DETAIL","IP"].map(h => (
                <span key={h} style={{ fontSize: 10, letterSpacing: "0.12em",
                                       color: "var(--accent3)", fontFamily: "var(--font-ui)",
                                       fontWeight: 700 }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((log, i) => {
              const color = ACTION_COLOR[log.action] || "var(--accent3)";
              const label = ACTION_LABELS[log.action] || log.action.toUpperCase();
              const ts    = new Date(log.created_at);
              const detail = typeof log.detail === "string"
                ? JSON.parse(log.detail || "{}")
                : (log.detail || {});

              return (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "160px 90px 120px 180px 1fr 110px",
                  gap: "0 16px", padding: "10px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: 11, color: "var(--accent3)", fontFamily: "var(--font-mono)" }}>
                    {ts.toLocaleDateString()} {ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
                    color, background: `${color}18`,
                    padding: "3px 7px", borderRadius: 4,
                    fontFamily: "var(--font-ui)", whiteSpace: "nowrap",
                  }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--font-mono)",
                                 overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.resource_name || log.resource_id || "—"}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--accent2)", fontFamily: "var(--font-mono)",
                                 overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.user_email || "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--accent3)", fontFamily: "var(--font-mono)",
                                 overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join("  ·  ") || "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--accent3)", fontFamily: "var(--font-mono)" }}>
                    {log.ip_address || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
