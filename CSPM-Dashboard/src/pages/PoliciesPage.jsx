import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Constants ───────────────────────────────────────────────────────────────

const SEV_COLOR = {
  CRITICAL: "#ff3b30",
  HIGH:     "#ff9500",
  MEDIUM:   "#ffd60a",
  LOW:      "#34c759",
};

const SEV_BG = {
  CRITICAL: "rgba(255,59,48,0.10)",
  HIGH:     "rgba(255,149,0,0.10)",
  MEDIUM:   "rgba(255,214,10,0.10)",
  LOW:      "rgba(52,199,89,0.08)",
};

const FRAMEWORKS    = ["ALL","CIS","NIST","PCI","HIPAA","SOC2","ISO27001","GDPR","CUSTOM"];
const CLOUD_OPTIONS = ["all","aws","azure"];
const SEVERITIES    = ["ALL","CRITICAL","HIGH","MEDIUM","LOW"];

const ALLOWED_FIELDS = [
  "is_public","is_encrypted","https_only","ssh_open","rdp_open",
  "all_traffic_open","mfa_enabled","versioning","imdsv2","logging_enabled",
  "flow_logs","soft_delete","purge_protection","tde_enabled","auditing_enabled",
  "tls_12_enforced","multi_region","name","resource_type","region","cloud",
];

const OPERATORS = [
  "is_true","is_false","equals","not_equals",
  "contains","not_contains","greater_than","less_than","starts_with",
];

const EMPTY_RULE = {
  rule_id:"", cloud:"aws", service:"", severity:"HIGH",
  title:"", field:"is_public", operator:"is_true",
  value:"", message:"", remediation:"", frameworks:["CUSTOM"],
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PoliciesPage({ token, role }) {
  const canEdit = role !== "viewer";
  const [rules,         setRules]         = useState([]);
  const [stats,         setStats]         = useState({});
  const [fwCoverage,    setFwCoverage]    = useState({});
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // Filters
  const [search,        setSearch]        = useState("");
  const [cloudFilter,   setCloudFilter]   = useState("all");
  const [fwFilter,      setFwFilter]      = useState("ALL");
  const [sevFilter,     setSevFilter]     = useState("ALL");

  // UI state
  const [collapsed,     setCollapsed]     = useState({});
  const [showModal,     setShowModal]     = useState(false);
  const [newRule,       setNewRule]       = useState({ ...EMPTY_RULE });
  const [saveStatus,    setSaveStatus]    = useState("");
  const [saving,        setSaving]        = useState(false);
  const [deletingId,    setDeletingId]    = useState(null);

  // ── Data Fetching ────────────────────────────────────────────────────────

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    const authHdr = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res  = await fetch(`${API}/policies`, { headers: authHdr });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRules(data.rules || []);
      setStats(data.stats || {});
      setFwCoverage(data.frameworks || {});
    } catch (e) {
      setError("Cannot connect to API. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  // ── Filtering ────────────────────────────────────────────────────────────

  const filtered = rules.filter(r => {
    const matchCloud  = cloudFilter === "all" || r.cloud === cloudFilter;
    const matchFW     = fwFilter === "ALL" ||
                        (r.frameworks || []).some(f => f.startsWith(fwFilter));
    const matchSev    = sevFilter === "ALL" || r.severity === sevFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      (r.title    || "").toLowerCase().includes(q) ||
      (r.rule_id  || "").toLowerCase().includes(q) ||
      (r.service  || "").toLowerCase().includes(q) ||
      (r.message  || "").toLowerCase().includes(q);
    return matchCloud && matchFW && matchSev && matchSearch;
  });

  // Group by cloud → service
  const grouped = {};
  filtered.forEach(r => {
    const key = `${r.cloud}::${r.service || "Other"}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  // ── Actions ──────────────────────────────────────────────────────────────

  const toggleSection = (key) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const collapseAll = () => {
    const keys = Object.keys(grouped);
    const allCollapsed = keys.every(k => collapsed[k]);
    const next = {};
    keys.forEach(k => next[k] = !allCollapsed);
    setCollapsed(next);
  };

  const handleDeleteCustom = async (rule_id) => {
    setDeletingId(rule_id);
    try {
      const res = await fetch(`${API}/custom-rules/${rule_id}`, {
        method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        fetchPolicies();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveRule = async () => {
    if (!newRule.rule_id || !newRule.title || !newRule.message || !newRule.service) {
      setSaveStatus("error:Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setSaveStatus("");
    try {
      const res = await fetch(`${API}/custom-rules`, {
        method:  "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
        body:    JSON.stringify(newRule),
      });
      if (res.ok) {
        setShowModal(false);
        setNewRule({ ...EMPTY_RULE });
        setSaveStatus("");
        fetchPolicies();
      } else {
        const err = await res.json();
        setSaveStatus(`error:${err.detail || "Failed to save rule."}`);
      }
    } catch (e) {
      setSaveStatus("error:Cannot connect to API.");
    } finally {
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSaveStatus("");
    setNewRule({ ...EMPTY_RULE });
  };

  // ── Render Helpers ───────────────────────────────────────────────────────

  const CloudBadge = ({ cloud }) => (
    <span style={{
      background:   cloud === "aws" ? "#ff9900" : "#0089d6",
      color:        "#000",
      fontSize:     "9px",
      fontWeight:   700,
      padding:      "2px 6px",
      borderRadius: "3px",
      letterSpacing:"0.08em",
      fontFamily:   "var(--font-ui)",
      flexShrink:   0,
    }}>
      {cloud.toUpperCase()}
    </span>
  );

  const SevBadge = ({ severity }) => (
    <span style={{
      fontSize:      "10px",
      fontWeight:    700,
      letterSpacing: "0.06em",
      color:         SEV_COLOR[severity] || "var(--accent2)",
      background:    SEV_BG[severity]    || "transparent",
      padding:       "2px 7px",
      borderRadius:  "3px",
      fontFamily:    "var(--font-ui)",
      whiteSpace:    "nowrap",
    }}>
      {severity}
    </span>
  );

  const FrameworkTag = ({ fw }) => (
    <span style={{
      background:    "var(--surface)",
      border:        "1px solid var(--border)",
      borderRadius:  "3px",
      padding:       "1px 5px",
      fontSize:      "10px",
      color:         "var(--accent3)",
      fontFamily:    "var(--font-mono)",
      whiteSpace:    "nowrap",
    }}>
      {fw}
    </span>
  );

  // ── States ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "60vh", flexDirection: "column", gap: "16px",
    }}>
      <div style={{
        width: "32px", height: "32px", border: "2px solid var(--border)",
        borderTop: "2px solid var(--accent)", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <span style={{ color: "var(--accent3)", fontFamily: "var(--font-mono)",
                     fontSize: "12px", letterSpacing: "0.1em" }}>
        LOADING POLICY LIBRARY...
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <div style={{ color: SEV_COLOR.CRITICAL, fontSize: "14px",
                    fontFamily: "var(--font-mono)", marginBottom: "12px" }}>
        CONNECTION ERROR
      </div>
      <div style={{ color: "var(--accent2)", fontSize: "13px",
                    fontFamily: "var(--font-ui)", marginBottom: "20px" }}>
        {error}
      </div>
      <button onClick={fetchPolicies} className="neon-btn" style={{
        background: "transparent", color: "var(--cyan)",
        border: "1px solid var(--cyan)",
        borderRadius: "6px", padding: "9px 18px", cursor: "pointer",
        fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "13px",
        boxShadow: "var(--glow-cyan)",
      }}>
        RETRY
      </button>
    </div>
  );

  const allKeys       = Object.keys(grouped);
  const allCollapsed  = allKeys.length > 0 && allKeys.every(k => collapsed[k]);
  const statusIsError = saveStatus.startsWith("error:");
  const statusMsg     = saveStatus.replace("error:", "");
  const valueNeeded   = !["is_true","is_false"].includes(newRule.operator);

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: "1200px",
                  margin: "0 auto", fontFamily: "var(--font-ui)" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:"24px" }}>
        <div>
          <h1 style={{
            color: "var(--accent)", fontSize: "22px",
            fontFamily: "var(--font-display)", fontWeight: 700,
            margin: 0, letterSpacing: "0.05em",
          }}>
            POLICY LIBRARY
          </h1>
          <p style={{ color: "var(--accent3)", fontSize: "13px",
                      margin: "4px 0 0", fontFamily: "var(--font-mono)" }}>
            {stats.total || 0} rules across{" "}
            {Object.keys(fwCoverage).filter(k => k !== "CUSTOM").length} frameworks
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setShowModal(true)} className="neon-btn" style={{
            background: "transparent", color: "var(--cyan)",
            border: "1px solid var(--cyan)", borderRadius: "6px", padding: "9px 20px",
            fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "13px",
            cursor: "pointer", letterSpacing: "0.08em", whiteSpace: "nowrap",
            boxShadow: "var(--glow-cyan)",
          }}>
            + ADD CUSTOM RULE
          </button>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)",
                    gap:"10px", marginBottom:"24px" }}>
        {[
          { label:"TOTAL",    value: stats.total    || 0, color:"var(--accent)" },
          { label:"CRITICAL", value: stats.critical  || 0, color: SEV_COLOR.CRITICAL },
          { label:"HIGH",     value: stats.high      || 0, color: SEV_COLOR.HIGH },
          { label:"MEDIUM",   value: stats.medium    || 0, color: SEV_COLOR.MEDIUM },
          { label:"LOW",      value: stats.low       || 0, color: SEV_COLOR.LOW },
          { label:"CUSTOM",   value: stats.custom    || 0, color:"#7b8cde" },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "8px", padding: "14px 16px",
          }}>
            <div style={{
              color: s.color, fontSize: "24px", fontWeight: 700,
              fontFamily: "var(--font-display)",
            }}>{s.value}</div>
            <div style={{
              color: "var(--accent3)", fontSize: "10px",
              letterSpacing: "0.1em", marginTop: "3px",
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Framework Coverage ── */}
      {Object.keys(fwCoverage).length > 0 && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "8px", padding: "16px 20px", marginBottom: "24px",
        }}>
          <div style={{ color: "var(--accent3)", fontSize: "11px",
                        letterSpacing: "0.1em", marginBottom: "12px",
                        fontFamily: "var(--font-mono)" }}>
            FRAMEWORK COVERAGE
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {Object.entries(fwCoverage)
              .filter(([k]) => k !== "CUSTOM")
              .sort((a, b) => b[1] - a[1])
              .map(([fw, count]) => (
                <div key={fw} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "5px", padding: "5px 10px", cursor: "pointer",
                }} onClick={() => setFwFilter(fwFilter === fw ? "ALL" : fw)}>
                  <span style={{
                    color: fwFilter === fw ? "var(--accent)" : "var(--accent2)",
                    fontSize: "12px", fontWeight: 600,
                    fontFamily: "var(--font-ui)",
                  }}>{fw}</span>
                  <span style={{
                    color: "var(--accent3)", fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                  }}>{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display:"flex", gap:"10px", marginBottom:"16px",
                    flexWrap:"wrap", alignItems:"center" }}>

        {/* Search */}
        <input
          placeholder="Search rule ID, title, service..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: "1", minWidth: "220px",
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "6px", padding: "8px 12px",
            color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: "13px",
            outline: "none",
          }}
        />

        {/* Cloud Toggle */}
        <div style={{ display:"flex", background:"var(--card)",
                      border:"1px solid var(--border)", borderRadius:"6px",
                      overflow:"hidden" }}>
          {CLOUD_OPTIONS.map(c => (
            <button key={c} onClick={() => setCloudFilter(c)} style={{
              padding: "8px 14px", border: "none", cursor: "pointer",
              background: cloudFilter === c ? "rgba(79,143,247,0.08)" : "transparent",
              color:      cloudFilter === c ? "var(--cyan)"        : "var(--accent3)",
              borderBottom: cloudFilter === c ? "2px solid var(--cyan)" : "2px solid transparent",
              fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "11px",
              letterSpacing: "0.08em", textTransform: "uppercase",
              transition: "all 0.15s",
            }}>{c}</button>
          ))}
        </div>

        {/* Framework Filter */}
        <select
          value={fwFilter}
          onChange={e => setFwFilter(e.target.value)}
          style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "6px", padding: "8px 12px",
            color: "var(--accent)", fontFamily: "var(--font-ui)", fontSize: "12px",
            cursor: "pointer", outline: "none",
          }}
        >
          {FRAMEWORKS.map(f => (
            <option key={f} value={f}>
              {f === "ALL" ? "All Frameworks" : f}
            </option>
          ))}
        </select>
      </div>

      {/* Severity Pills */}
      <div style={{ display:"flex", gap:"6px", marginBottom:"20px", flexWrap:"wrap" }}>
        {SEVERITIES.map(s => (
          <button key={s} onClick={() => setSevFilter(s)} style={{
            padding: "5px 14px", cursor: "pointer", fontSize: "11px",
            fontFamily: "var(--font-ui)", fontWeight: 600, letterSpacing: "0.06em",
            borderRadius: "5px", transition: "all 0.15s",
            background:   sevFilter === s ? (SEV_COLOR[s] || "var(--accent)") : "var(--card)",
            color:        sevFilter === s ? "#fff" : "var(--accent2)",
            border: `1px solid ${sevFilter === s ? (SEV_COLOR[s] || "var(--accent)") : "var(--border)"}`,
          }}>{s}</button>
        ))}

        <button onClick={collapseAll} style={{
          marginLeft: "auto", padding: "5px 14px", cursor: "pointer",
          fontSize: "11px", fontFamily: "var(--font-ui)", fontWeight: 600,
          letterSpacing: "0.06em", borderRadius: "5px",
          background: "transparent", color: "var(--accent3)",
          border: "1px solid var(--border)",
        }}>
          {allCollapsed ? "EXPAND ALL" : "COLLAPSE ALL"}
        </button>
      </div>

      {/* Result Count */}
      {(search || cloudFilter !== "all" || fwFilter !== "ALL" || sevFilter !== "ALL") && (
        <div style={{ color:"var(--accent3)", fontSize:"12px",
                      marginBottom:"16px", fontFamily:"var(--font-mono)" }}>
          Showing {filtered.length} of {rules.length} rules
        </div>
      )}

      {/* No Results */}
      {allKeys.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          color: "var(--accent3)", fontFamily: "var(--font-mono)", fontSize: "13px",
        }}>
          No rules match your current filters.
        </div>
      )}

      {/* ── Rule Groups ── */}
      {Object.entries(grouped).sort().map(([key, sectionRules]) => {
        const [cloud, service] = key.split("::");
        const isCollapsed = collapsed[key];
        const critCount = sectionRules.filter(r => r.severity === "CRITICAL").length;

        return (
          <div key={key} style={{
            marginBottom: "10px",
            border:       "1px solid var(--border)",
            borderRadius: "8px",
            overflow:     "hidden",
          }}>
            {/* Section Header */}
            <div
              onClick={() => toggleSection(key)}
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                padding:        "12px 16px",
                background:     "var(--surface)",
                cursor:         "pointer",
                userSelect:     "none",
              }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <CloudBadge cloud={cloud} />
                <span style={{
                  color: "var(--accent)", fontWeight: 600, fontSize: "14px",
                  fontFamily: "var(--font-display)", letterSpacing: "0.04em",
                }}>
                  {service}
                </span>
                <span style={{
                  color: "var(--accent3)", fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}>
                  {sectionRules.length} rules
                </span>
                {critCount > 0 && (
                  <span style={{
                    background: SEV_BG.CRITICAL, color: SEV_COLOR.CRITICAL,
                    fontSize: "10px", fontWeight: 700, padding: "1px 6px",
                    borderRadius: "3px", fontFamily: "var(--font-ui)",
                  }}>
                    {critCount} CRITICAL
                  </span>
                )}
              </div>
              <span style={{ color:"var(--accent3)", fontSize:"12px" }}>
                {isCollapsed ? "▶" : "▼"}
              </span>
            </div>

            {/* Rule Rows */}
            {!isCollapsed && (
              <div>
                {sectionRules.map((rule, i) => (
                  <div key={rule.rule_id} style={{
                    display:     "grid",
                    gridTemplateColumns: "130px 80px 1fr auto",
                    gap:         "14px",
                    alignItems:  "start",
                    padding:     "12px 16px",
                    background:  i % 2 === 0 ? "var(--card)" : "var(--surface)",
                    borderTop:   "1px solid var(--border)",
                  }}>
                    {/* Rule ID */}
                    <div>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: "11px",
                        color: rule.is_custom ? "#7b8cde" : "var(--accent2)",
                      }}>
                        {rule.rule_id}
                      </span>
                      {rule.is_custom && (
                        <div style={{
                          fontSize: "9px", color: "#7b8cde",
                          fontFamily: "var(--font-ui)", marginTop: "2px",
                          letterSpacing: "0.08em",
                        }}>
                          CUSTOM
                        </div>
                      )}
                    </div>

                    {/* Severity */}
                    <div style={{ paddingTop: "1px" }}>
                      <SevBadge severity={rule.severity} />
                    </div>

                    {/* Title + Frameworks */}
                    <div>
                      <div style={{
                        color: "var(--accent)", fontSize: "13px",
                        fontWeight: 500, marginBottom: "4px", lineHeight: "1.4",
                      }}>
                        {rule.title}
                      </div>
                      <div style={{
                        color: "var(--accent3)", fontSize: "12px",
                        marginBottom: "6px", lineHeight: "1.4",
                      }}>
                        {rule.message}
                      </div>
                      <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                        {(rule.frameworks || []).map(fw => (
                          <FrameworkTag key={fw} fw={fw} />
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex", alignItems:"center", paddingTop:"1px" }}>
                      {rule.is_custom && canEdit ? (
                        <button
                          onClick={() => handleDeleteCustom(rule.rule_id)}
                          disabled={deletingId === rule.rule_id}
                          style={{
                            background:   "transparent",
                            border:       "1px solid var(--red)",
                            borderRadius: "4px",
                            padding:      "4px 10px",
                            color:        "var(--red)",
                            fontSize:     "11px",
                            cursor:       deletingId === rule.rule_id ? "not-allowed" : "pointer",
                            fontFamily:   "var(--font-ui)",
                            opacity:      deletingId === rule.rule_id ? 0.5 : 1,
                          }}
                        >
                          {deletingId === rule.rule_id ? "..." : "DELETE"}
                        </button>
                      ) : (
                        <div style={{
                          width: "10px", height: "10px", borderRadius: "50%",
                          background: "var(--border)",
                        }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Add Custom Rule Modal ── */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
            animation: "overlayIn 0.2s ease-out",
          }}
          onClick={e => e.target === e.currentTarget && handleModalClose()}
        >
          <div style={{
            background:   "var(--surface)",
            border:       "1px solid var(--border)",
            borderRadius: "12px",
            animation:    "modalIn 0.25s cubic-bezier(0.23, 1, 0.32, 1)",
            padding:      "32px",
            width:        "540px",
            maxHeight:    "90vh",
            overflowY:    "auto",
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "24px",
            }}>
              <h2 style={{
                color: "var(--accent)", fontFamily: "var(--font-display)",
                fontSize: "18px", fontWeight: 700, margin: 0,
                letterSpacing: "0.05em",
              }}>
                ADD CUSTOM RULE
              </h2>
              <button onClick={handleModalClose} style={{
                background: "transparent", border: "none",
                color: "var(--accent3)", fontSize: "20px", cursor: "pointer",
                lineHeight: 1, padding: "0 4px",
              }}>×</button>
            </div>

            {/* Form Fields */}
            {[
              ["RULE ID *",    "rule_id",    "CUSTOM-001",     "Rule IDs must be unique"],
              ["SERVICE *",    "service",    "S3, EC2, NSG...", "AWS or Azure service name"],
              ["TITLE *",      "title",      "Brief description of this check", null],
              ["MESSAGE *",    "message",    "What this finding means to the user", null],
              ["REMEDIATION",  "remediation","How to fix this issue", null],
            ].map(([label, key, placeholder, hint]) => (
              <FormField
                key={key} label={label} hint={hint}
                placeholder={placeholder}
                value={newRule[key]}
                onChange={v => setNewRule({ ...newRule, [key]: v })}
              />
            ))}

            {/* Select fields */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              {[
                ["CLOUD",    "cloud",    ["aws","azure","all"]],
                ["SEVERITY", "severity", ["CRITICAL","HIGH","MEDIUM","LOW"]],
                ["FIELD *",  "field",    ALLOWED_FIELDS],
                ["OPERATOR *","operator", OPERATORS],
              ].map(([label, key, opts]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <select
                    value={newRule[key]}
                    onChange={e => setNewRule({ ...newRule, [key]: e.target.value })}
                    style={selectStyle}
                  >
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Value (conditional) */}
            {valueNeeded && (
              <FormField
                label="COMPARE VALUE"
                hint="The value to compare the field against"
                placeholder="e.g. prod, true, 90"
                value={newRule.value}
                onChange={v => setNewRule({ ...newRule, value: v })}
              />
            )}

            {/* Preview */}
            <div style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "6px", padding: "12px 14px", marginTop: "8px",
              marginBottom: "16px",
            }}>
              <div style={{ color:"var(--accent3)", fontSize:"10px",
                            letterSpacing:"0.1em", marginBottom:"8px",
                            fontFamily:"var(--font-mono)" }}>
                RULE PREVIEW
              </div>
              <div style={{ display:"flex", gap:"8px", alignItems:"center",
                            flexWrap:"wrap" }}>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"11px",
                               color:"#7b8cde" }}>
                  {newRule.rule_id || "CUSTOM-???"}
                </span>
                <SevBadge severity={newRule.severity} />
                <span style={{ fontFamily:"var(--font-ui)", fontSize:"12px",
                               color:"var(--accent2)" }}>
                  {newRule.title || "Enter a title..."}
                </span>
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:"11px",
                            color:"var(--accent3)", marginTop:"6px" }}>
                IF {newRule.field} {newRule.operator}{valueNeeded ? ` "${newRule.value}"` : ""} → TRIGGER
              </div>
            </div>

            {/* Status Message */}
            {statusMsg && (
              <div style={{
                padding: "8px 12px", borderRadius: "6px", marginBottom: "14px",
                background: statusIsError ? "rgba(224,85,85,0.08)" : "rgba(76,175,125,0.08)",
                color:      statusIsError ? "var(--red)" : "var(--green)",
                fontSize:   "12px", fontFamily: "var(--font-mono)",
              }}>
                {statusMsg}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display:"flex", gap:"12px" }}>
              <button onClick={handleSaveRule} disabled={saving} className="neon-btn" style={{
                flex: 1, background: "transparent",
                color: saving ? "var(--accent3)" : "var(--cyan)",
                border: `1px solid ${saving ? "var(--border)" : "var(--cyan)"}`,
                borderRadius: "6px", padding: "10px",
                fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "13px",
                cursor: saving ? "not-allowed" : "pointer",
                letterSpacing: "0.08em",
                boxShadow: saving ? "none" : "var(--glow-cyan)",
              }}>
                {saving ? "SAVING..." : "SAVE RULE"}
              </button>
              <button onClick={handleModalClose} style={{
                flex: 1, background: "transparent", color: "var(--accent2)",
                border: "1px solid var(--border)", borderRadius: "6px", padding: "10px",
                fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "13px",
                cursor: "pointer",
              }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({ label, hint, placeholder, value, onChange }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={labelStyle}>{label}</label>
      {hint && (
        <span style={{ color:"var(--accent3)", fontSize:"10px",
                       fontFamily:"var(--font-ui)", marginLeft:"6px" }}>
          {hint}
        </span>
      )}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const labelStyle = {
  color:         "var(--accent3)",
  fontSize:      "10px",
  letterSpacing: "0.1em",
  display:       "block",
  marginBottom:  "5px",
  fontFamily:    "var(--font-ui)",
  fontWeight:    600,
};

const inputStyle = {
  width:       "100%",
  boxSizing:   "border-box",
  background:  "var(--card)",
  border:      "1px solid var(--border)",
  borderRadius:"6px",
  padding:     "8px 12px",
  color:       "var(--accent)",
  fontFamily:  "var(--font-mono)",
  fontSize:    "13px",
  outline:     "none",
};

const selectStyle = {
  width:       "100%",
  background:  "var(--card)",
  border:      "1px solid var(--border)",
  borderRadius:"6px",
  padding:     "8px 10px",
  color:       "var(--accent)",
  fontFamily:  "var(--font-mono)",
  fontSize:    "12px",
  cursor:      "pointer",
  outline:     "none",
  marginBottom:"14px",
};
