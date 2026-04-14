import { useState, useMemo, useEffect } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SEV_COLOR = {
  CRITICAL: "#dc2626",
  HIGH:     "#ea580c",
  MEDIUM:   "#ca8a04",
  LOW:      "#16a34a",
};
const SEV_ORDER = ["CRITICAL","HIGH","MEDIUM","LOW"];

function scoreLabel(score) {
  if (score >= 70) return ["LOW RISK",      "#16a34a"];
  if (score >= 50) return ["MEDIUM RISK",   "#ca8a04"];
  if (score >= 30) return ["HIGH RISK",     "#ea580c"];
  return             ["CRITICAL RISK", "#dc2626"];
}

function ScoreCard({ label, score }) {
  const [text, color] = scoreLabel(score);
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "10px", padding: "20px",
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: "42px",
        fontWeight: 800, color, lineHeight: 1,
      }}>{score}</div>
      <div style={{ color: "var(--accent)", fontSize: "13px", fontWeight: 600, marginTop: "6px" }}>{label}</div>
      <div style={{ color, fontSize: "11px", fontFamily: "var(--font-ui)", letterSpacing: "0.08em", marginTop: "3px" }}>{text}</div>
    </div>
  );
}

// ── Resource Drawer ──────────────────────────────────────────────────────────
function ResourceDrawer({ resources, cleanCount, totalCount, onClose }) {
  const [search,    setSearch]    = useState("");
  const [showClean, setShowClean] = useState(false);

  const filtered = resources.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.service.toLowerCase().includes(search.toLowerCase()) ||
    r.cloud.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex",
      animation: "overlayIn 0.2s ease-out",
    }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} />
      <div style={{
        width: "480px", background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        animation: "slideIn 0.25s cubic-bezier(0.23, 1, 0.32, 1)",
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "16px",
              fontWeight: 700, color: "var(--accent)", letterSpacing: "0.05em" }}>
              SCANNED RESOURCES
            </div>
            <div style={{ color: "var(--accent3)", fontSize: "12px",
              fontFamily: "var(--font-mono)", marginTop: "4px" }}>
              {totalCount} total · {resources.length} with findings · {cleanCount} clean
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent",
            border: "1px solid var(--border)", borderRadius: "6px",
            color: "var(--accent2)", cursor: "pointer",
            padding: "6px 12px", fontFamily: "var(--font-ui)", fontSize: "12px" }}>
            CLOSE ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <input placeholder="Search resources..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", background: "var(--card)",
              border: "1px solid var(--border)", borderRadius: "6px",
              padding: "8px 12px", color: "var(--accent)",
              fontFamily: "var(--font-mono)", fontSize: "12px", boxSizing: "border-box" }} />
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>

          {/* Resources with findings */}
          {filtered.length > 0 && (
            <div style={{ padding: "8px 24px 4px",
              color: "var(--accent3)", fontSize: "10px",
              fontFamily: "var(--font-ui)", letterSpacing: "0.1em", fontWeight: 600 }}>
              WITH FINDINGS ({filtered.length})
            </div>
          )}

          {filtered.map((r, i) => (
            <div key={i} style={{ padding: "12px 24px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: "12px",
              background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.15)" }}>
              <span style={{
                background: r.cloud === "aws" ? "#ff9900" : "#0089d6",
                color: r.cloud === "aws" ? "#000" : "#fff",
                fontSize: "9px", fontWeight: 700,
                padding: "2px 6px", borderRadius: "3px",
                letterSpacing: "0.08em", flexShrink: 0,
                fontFamily: "var(--font-ui)" }}>{r.cloud.toUpperCase()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "var(--accent)", fontSize: "13px",
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name}
                </div>
                <div style={{ color: "var(--accent3)", fontSize: "11px",
                  fontFamily: "var(--font-ui)", marginTop: "2px" }}>
                  {r.service}
                </div>
              </div>
              <span style={{
                background: SEV_COLOR[r.topSeverity] + "22",
                color: SEV_COLOR[r.topSeverity],
                border: `1px solid ${SEV_COLOR[r.topSeverity]}44`,
                fontSize: "10px", fontWeight: 700,
                padding: "2px 7px", borderRadius: "3px",
                flexShrink: 0, fontFamily: "var(--font-ui)" }}>
                {r.findingCount} {r.findingCount === 1 ? "finding" : "findings"}
              </span>
            </div>
          ))}

          {filtered.length === 0 && search && (
            <div style={{ padding: "32px", textAlign: "center",
              color: "var(--accent3)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
              No resources match "{search}"
            </div>
          )}

          {/* Clean resources section */}
          {cleanCount > 0 && (
            <>
              <div onClick={() => setShowClean(o => !o)} style={{
                padding: "10px 24px",
                borderTop: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between",
                alignItems: "center", cursor: "pointer",
                background: "rgba(76,175,125,0.05)",
              }}>
                <span style={{ color: "var(--green)", fontSize: "11px",
                  fontFamily: "var(--font-ui)", fontWeight: 700, letterSpacing: "0.08em" }}>
                  ✓ CLEAN RESOURCES ({cleanCount})
                </span>
                <span style={{ color: "var(--accent3)", fontSize: "11px" }}>
                  {showClean ? "▲" : "▼"}
                </span>
              </div>
              {showClean && (
                <div style={{ padding: "8px 24px 12px",
                  background: "rgba(76,175,125,0.03)" }}>
                  <div style={{ color: "var(--accent3)", fontSize: "11px",
                    fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
                    {cleanCount} resource{cleanCount !== 1 ? "s" : ""} scanned with no security findings detected.
                    These resources are fully compliant with all {resources.length + cleanCount > 0 ? "applicable" : ""} policy rules.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const PAGE_SIZE = 100;

export default function ResultsPage({ result, onNewScan }) {
  const [search,        setSearch]       = useState("");
  const [sevFilter,     setSevFilter]    = useState("ALL");
  const [cloudFilter,   setCloudFilter]  = useState("ALL");
  const [svcFilter,     setSvcFilter]    = useState("ALL");
  const [fwFilter,      setFwFilter]     = useState("ALL");
  const [statusFilter,  setStatusFilter] = useState("ALL");
  const [expanded,      setExpanded]     = useState(null);
  const [statuses,      setStatuses]     = useState({});
  const [statusMsg,     setStatusMsg]    = useState(null);
  const [page,          setPage]         = useState(0);

  const { scores = {}, findings = [], resources_scanned = 0 } = result || {};

  // ── Derive resource list from findings ──────────────────────────────────
  const resourceList = useMemo(() => {
    const map = {};
    findings.forEach(f => {
      const key = f.resource_id;
      if (!map[key]) {
        map[key] = {
          id:           f.resource_id,
          name:         f.resource_name,
          cloud:        f.cloud,
          service:      f.service,
          type:         f.resource_id.split("::")[0] || f.service,
          findings:     [],
          findingCount: 0,
          topSeverity:  "LOW",
        };
      }
      map[key].findings.push(f);
      map[key].findingCount++;
      const order = ["LOW","MEDIUM","HIGH","CRITICAL"];
      if (order.indexOf(f.severity) > order.indexOf(map[key].topSeverity)) {
        map[key].topSeverity = f.severity;
      }
    });
    return Object.values(map).sort((a,b) =>
      ["LOW","MEDIUM","HIGH","CRITICAL"].indexOf(b.topSeverity) -
      ["LOW","MEDIUM","HIGH","CRITICAL"].indexOf(a.topSeverity)
    );
  }, [findings]);

  const allServices = useMemo(() =>
    [...new Set(findings.map(f => f.service).filter(Boolean))].sort(),
    [findings]
  );

  // ── Findings by service (for chart) ──────────────────────────────────────
  const serviceChartData = useMemo(() => {
    const map = {};
    findings.forEach(f => {
      const svc = f.service || "Other";
      if (!map[svc]) map[svc] = { service: svc, CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 };
      map[svc][f.severity] = (map[svc][f.severity] || 0) + 1;
    });
    return Object.values(map)
      .sort((a, b) => (b.CRITICAL*10 + b.HIGH*7 + b.MEDIUM*4 + b.LOW) -
                      (a.CRITICAL*10 + a.HIGH*7 + a.MEDIUM*4 + a.LOW))
      .slice(0, 6);  // top 6 services
  }, [findings]);

  const allFrameworks = useMemo(() => {
    const fwSet = new Set();
    findings.forEach(f => (f.frameworks || []).forEach(fw => {
      const prefix = fw.split("-")[0];
      if (prefix) fwSet.add(prefix);
    }));
    return ["ALL", ...Array.from(fwSet).sort()];
  }, [findings]);

  const filtered = useMemo(() => findings.filter(f => {
    const matchSev   = sevFilter   === "ALL" || f.severity === sevFilter;
    const matchCloud = cloudFilter === "ALL" || f.cloud    === cloudFilter;
    const matchSvc   = svcFilter   === "ALL" || f.service  === svcFilter;
    const matchFw    = fwFilter    === "ALL" ||
      (f.frameworks || []).some(fw => fw.startsWith(fwFilter));
    const fStatus    = statuses[`${f.rule_id}::${f.resource_id}`] || f.status || "open";
    const matchStatus = statusFilter === "ALL" || fStatus === statusFilter;
    const q          = search.toLowerCase();
    const matchSearch = !q ||
      f.rule_id?.toLowerCase().includes(q) ||
      f.resource_name?.toLowerCase().includes(q) ||
      f.message?.toLowerCase().includes(q) ||
      f.service?.toLowerCase().includes(q);
    return matchSev && matchCloud && matchSvc && matchFw && matchStatus && matchSearch;
  }), [findings, sevFilter, cloudFilter, svcFilter, fwFilter, statusFilter, search, statuses]);

  // Reset to page 0 whenever filters change
  useEffect(() => { setPage(0); }, [sevFilter, cloudFilter, svcFilter, fwFilter, statusFilter, search]);

  const sevCounts = useMemo(() =>
    SEV_ORDER.reduce((acc, s) => ({
      ...acc, [s]: findings.filter(f => f.severity === s).length
    }), {}),
    [findings]
  );

  const pieData = SEV_ORDER
    .map(s => ({ name: s, value: sevCounts[s] || 0 }))
    .filter(d => d.value > 0);

  const scoreEntries = Object.entries(scores).filter(([k]) => k !== "overall");

  async function handleStatus(f, status) {
    const key = `${f.rule_id}::${f.resource_id}`;
    try {
      const res = await fetch(`${API}/finding-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding_key: key, status }),
      });
      if (res.ok) {
        setStatuses(p => ({ ...p, [key]: status }));
      } else {
        setStatusMsg("Failed to update finding status. Please try again.");
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch {
      setStatusMsg("Cannot reach the backend server.");
      setTimeout(() => setStatusMsg(null), 4000);
    }
  }

  function getStatus(f) {
    return statuses[`${f.rule_id}::${f.resource_id}`] || f.status || "open";
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1280px", margin: "0 auto",
                  animation: "fadeIn 0.3s ease" }}>
      {statusMsg && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 999,
          padding: "12px 20px", borderRadius: "8px",
          background: "rgba(224,85,85,0.12)", border: "1px solid rgba(224,85,85,0.3)",
          color: "#e05555", fontFamily: "var(--font-mono)", fontSize: "12px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          ⚠ {statusMsg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700,
            color: "var(--accent)", letterSpacing: "0.05em",
          }}>SCAN RESULTS</h1>
          <p style={{ color: "var(--accent3)", fontSize: "13px",
                      marginTop: "4px", fontFamily: "var(--font-mono)" }}>
            {resources_scanned} resources scanned · {findings.length} findings
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={async () => {
              const res = await fetch(`${API}/export-json`);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "cspm-report.json"; a.click();
            }}
            style={{
              padding: "8px 16px", background: "transparent",
              border: "1px solid var(--border)", borderRadius: "6px",
              color: "var(--accent2)", fontFamily: "var(--font-ui)",
              fontWeight: 600, fontSize: "12px", cursor: "pointer",
            }}
          >EXPORT JSON</button>
          <button onClick={onNewScan} className="neon-btn" style={{
            padding: "8px 16px", background: "transparent", color: "var(--cyan)",
            border: "1px solid var(--cyan)", borderRadius: "6px", fontFamily: "var(--font-ui)",
            fontWeight: 700, fontSize: "12px", cursor: "pointer",
            boxShadow: "var(--glow-cyan)",
          }}>NEW SCAN</button>
        </div>
      </div>

      {/* ── Score Cards ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.max(scoreEntries.length + (scoreEntries.length > 1 ? 1 : 0), 1)}, 1fr)`,
        gap: "14px", marginBottom: "24px",
      }}>
        {scoreEntries.map(([cloud, score]) => (
          <ScoreCard key={cloud} label={`${cloud.toUpperCase()} SCORE`} score={score} />
        ))}
        {scores.overall !== undefined && scoreEntries.length > 1 && (
          <ScoreCard label="OVERALL SCORE" score={scores.overall} />
        )}
      </div>

      {/* ── Stat Row ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px", marginBottom: "28px",
      }}>
        {[
          { label: "FINDINGS",  value: findings.length,       color: "var(--accent)" },
          { label: "CRITICAL",  value: sevCounts.CRITICAL||0, color: "var(--red)"    },
          { label: "HIGH",      value: sevCounts.HIGH||0,     color: "var(--orange)" },
          { label: "MEDIUM",    value: sevCounts.MEDIUM||0,   color: "var(--yellow)" },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "8px", padding: "16px",
          }}>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: "28px",
              fontWeight: 700, color: s.color,
            }}>{s.value}</div>
            <div style={{
              color: "var(--accent3)", fontSize: "10px",
              letterSpacing: "0.1em", marginTop: "3px",
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      {findings.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "1.6fr 1fr",
          gap: "16px", marginBottom: "28px",
        }}>

          {/* LEFT: Findings by Service — stacked bar */}
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "10px", padding: "20px",
          }}>
            <div style={{
              color: "var(--accent3)", fontSize: "11px",
              letterSpacing: "0.1em", marginBottom: "16px",
              fontFamily: "var(--font-ui)", fontWeight: 600,
            }}>FINDINGS BY SERVICE</div>
            {serviceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={serviceChartData} layout="vertical"
                          margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2026" horizontal={false} />
                  <XAxis type="number"
                    tick={{ fill: "#606068", fontSize: 11 }}
                    axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="service" width={100}
                    tick={{ fill: "#a0a0a8", fontSize: 11, fontFamily: "var(--font-ui)" }}
                    axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#18191d", border: "1px solid #2a2d35", borderRadius: "6px" }}
                    labelStyle={{ color: "#e8e8e8", fontFamily: "var(--font-ui)" }}
                  />
                  {SEV_ORDER.filter(s => serviceChartData.some(d => d[s] > 0)).map(s => (
                    <Bar key={s} dataKey={s} stackId="a"
                         fill={SEV_COLOR[s]} radius={s === "LOW" ? [0,3,3,0] : [0,0,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: "var(--accent3)", fontSize: "13px",
                            textAlign: "center", padding: "40px 0" }}>
                No findings to display
              </div>
            )}
          </div>

          {/* RIGHT: Severity distribution donut + risk breakdown */}
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "10px", padding: "20px",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{
              color: "var(--accent3)", fontSize: "11px",
              letterSpacing: "0.1em", marginBottom: "12px",
              fontFamily: "var(--font-ui)", fontWeight: 600,
            }}>SEVERITY BREAKDOWN</div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
                       innerRadius={38} outerRadius={60} paddingAngle={2}>
                    {pieData.map(d => (
                      <Cell key={d.name} fill={SEV_COLOR[d.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#18191d", border: "1px solid #2a2d35", borderRadius: "6px" }}
                    labelStyle={{ color: "#e8e8e8" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ flex: 1 }}>
                {SEV_ORDER.map(s => {
                  const count = sevCounts[s] || 0;
                  const pct   = findings.length > 0 ? Math.round(count / findings.length * 100) : 0;
                  return (
                    <div key={s} style={{ marginBottom: "10px" }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        marginBottom: "3px",
                      }}>
                        <span style={{
                          color: SEV_COLOR[s], fontSize: "11px",
                          fontFamily: "var(--font-ui)", fontWeight: 700,
                        }}>{s}</span>
                        <span style={{
                          color: "var(--accent2)", fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                        }}>{count}</span>
                      </div>
                      {/* Progress bar */}
                      <div style={{
                        height: "4px", background: "var(--border)",
                        borderRadius: "2px", overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: SEV_COLOR[s], borderRadius: "2px",
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Findings Table ── */}
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "10px", overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "12px",
        }}>
          <span style={{
            color: "var(--accent)", fontFamily: "var(--font-display)",
            fontSize: "14px", fontWeight: 700, letterSpacing: "0.05em",
          }}>
            FINDINGS ({filtered.length})
          </span>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Search..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "5px", padding: "6px 10px", color: "var(--accent)",
                fontFamily: "var(--font-mono)", fontSize: "12px", width: "180px",
              }}
            />

            {scoreEntries.length > 1 && (
              <div style={{
                display: "flex", background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: "5px", overflow: "hidden",
              }}>
                {["ALL","aws","azure"].map(c => (
                  <button key={c} onClick={() => setCloudFilter(c)} style={{
                    padding: "6px 10px", border: "none", cursor: "pointer",
                    background: cloudFilter === c ? "rgba(79,143,247,0.08)" : "transparent",
                    color:      cloudFilter === c ? "var(--cyan)"        : "var(--accent3)",
                    borderBottom: cloudFilter === c ? "2px solid var(--cyan)" : "2px solid transparent",
                    fontFamily: "var(--font-ui)", fontSize: "11px", fontWeight: 600,
                  }}>{c.toUpperCase()}</button>
                ))}
              </div>
            )}

            {["ALL","CRITICAL","HIGH","MEDIUM","LOW"].map(s => (
              <button key={s} onClick={() => setSevFilter(s)} style={{
                padding: "5px 10px", cursor: "pointer", fontSize: "10px",
                fontFamily: "var(--font-ui)", fontWeight: 700, borderRadius: "4px",
                background: sevFilter === s
                  ? (SEV_COLOR[s] ? SEV_COLOR[s]+"20" : "rgba(232,232,232,0.1)") : "transparent",
                color:  sevFilter === s ? (SEV_COLOR[s] || "var(--accent)") : "var(--accent3)",
                border: `1px solid ${sevFilter === s ? (SEV_COLOR[s] || "var(--accent)") : "var(--border)"}`,
              }}>{s}</button>
            ))}

            {allServices.length > 0 && (
              <select value={svcFilter} onChange={e => setSvcFilter(e.target.value)} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "5px", padding: "6px 8px", color: "var(--accent)",
                fontFamily: "var(--font-ui)", fontSize: "11px",
              }}>
                <option value="ALL">All Services</option>
                {allServices.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            {allFrameworks.length > 1 && (
              <select value={fwFilter} onChange={e => setFwFilter(e.target.value)} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "5px", padding: "6px 8px", color: "var(--accent)",
                fontFamily: "var(--font-ui)", fontSize: "11px",
              }}>
                {allFrameworks.map(fw => <option key={fw} value={fw}>{fw === "ALL" ? "All Frameworks" : fw}</option>)}
              </select>
            )}

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "5px", padding: "6px 8px", color: "var(--accent)",
              fontFamily: "var(--font-ui)", fontSize: "11px",
            }}>
              {["ALL","open","acknowledged","resolved"].map(s => (
                <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 && (
          <div style={{
            padding: "48px", textAlign: "center",
            color: "var(--accent3)", fontFamily: "var(--font-mono)", fontSize: "13px",
          }}>
            {findings.length === 0 ? "✓ No findings — clean scan!" : "No findings match filters."}
          </div>
        )}

        {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((f, i) => {
          const absIdx = page * PAGE_SIZE + i;
          const status = getStatus(f);
          const isExp  = expanded === absIdx;
          return (
            <div key={absIdx} style={{
              borderTop: "1px solid var(--border)",
              background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.15)",
            }}>
              <div
                onClick={() => setExpanded(isExp ? null : absIdx)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 100px 110px 1fr 160px 90px",
                  gap: "12px", padding: "12px 20px",
                  alignItems: "center", cursor: "pointer",
                }}
              >
                <span style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
                  color: SEV_COLOR[f.severity], fontFamily: "var(--font-ui)",
                  background: SEV_COLOR[f.severity] + "18",
                  padding: "2px 6px", borderRadius: "3px",
                }}>{f.severity}</span>

                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "11px",
                  color: "var(--accent2)",
                }}>{f.rule_id}</span>

                <span style={{
                  fontSize: "11px", color: "var(--accent3)",
                  background: "var(--surface)", padding: "2px 6px",
                  borderRadius: "3px", fontFamily: "var(--font-ui)",
                  border: "1px solid var(--border)",
                }}>{f.service}</span>

                <div>
                  <div style={{
                    color: "var(--accent)", fontSize: "13px", fontWeight: 500,
                  }}>{f.resource_name}</div>
                  <div style={{
                    color: "var(--accent3)", fontSize: "11px",
                    marginTop: "1px", fontFamily: "var(--font-mono)",
                  }}>
                    {f.message?.slice(0, 80)}{f.message?.length > 80 ? "..." : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                  {(f.frameworks || []).slice(0, 2).map(fw => (
                    <span key={fw} style={{
                      fontSize: "9px", color: "var(--accent3)",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      padding: "1px 4px", borderRadius: "2px",
                      fontFamily: "var(--font-mono)",
                    }}>{fw}</span>
                  ))}
                  {(f.frameworks||[]).length > 2 && (
                    <span style={{
                      fontSize: "9px", color: "var(--accent3)",
                      fontFamily: "var(--font-mono)",
                    }}>+{f.frameworks.length - 2}</span>
                  )}
                </div>

                <span style={{
                  fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em",
                  color: status === "resolved"     ? "var(--green)"
                       : status === "acknowledged" ? "var(--yellow)"
                       : "var(--accent3)",
                  fontFamily: "var(--font-ui)", textTransform: "uppercase",
                }}>{status}</span>
              </div>

              {isExp && (
                <div style={{
                  padding: "0 20px 16px",
                  borderTop: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.2)",
                }}>
                  <div style={{
                    paddingTop: "14px", display: "grid",
                    gridTemplateColumns: "1fr 1fr", gap: "16px",
                  }}>
                    <div>
                      <div style={{
                        color: "var(--accent3)", fontSize: "10px",
                        letterSpacing: "0.1em", marginBottom: "5px",
                        fontFamily: "var(--font-ui)",
                      }}>FINDING DETAIL</div>
                      <p style={{
                        color: "var(--accent2)", fontSize: "12px",
                        fontFamily: "var(--font-mono)", lineHeight: 1.6,
                      }}>{f.message}</p>
                      <div style={{
                        display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "8px",
                      }}>
                        {(f.frameworks||[]).map(fw => (
                          <span key={fw} style={{
                            fontSize: "10px", color: "var(--accent3)",
                            background: "var(--surface)", border: "1px solid var(--border)",
                            padding: "2px 6px", borderRadius: "3px",
                            fontFamily: "var(--font-mono)",
                          }}>{fw}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{
                        color: "var(--accent3)", fontSize: "10px",
                        letterSpacing: "0.1em", marginBottom: "5px",
                        fontFamily: "var(--font-ui)",
                      }}>REMEDIATION</div>
                      <p style={{
                        color: "var(--accent)", fontSize: "12px",
                        fontFamily: "var(--font-mono)", lineHeight: 1.6,
                      }}>{f.remediation}</p>
                      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                        <button onClick={() => handleStatus(f, "resolved")} style={{
                          padding: "5px 12px", border: "1px solid var(--green)",
                          borderRadius: "4px", background: "transparent",
                          color: "var(--green)", cursor: "pointer",
                          fontFamily: "var(--font-ui)", fontSize: "11px", fontWeight: 600,
                        }}>MARK RESOLVED</button>
                        <button onClick={() => handleStatus(f, "acknowledged")} style={{
                          padding: "5px 12px", border: "1px solid var(--yellow)",
                          borderRadius: "4px", background: "transparent",
                          color: "var(--yellow)", cursor: "pointer",
                          fontFamily: "var(--font-ui)", fontSize: "11px", fontWeight: 600,
                        }}>ACKNOWLEDGE</button>
                        <button onClick={() => handleStatus(f, "open")} style={{
                          padding: "5px 12px", border: "1px solid var(--border)",
                          borderRadius: "4px", background: "transparent",
                          color: "var(--accent3)", cursor: "pointer",
                          fontFamily: "var(--font-ui)", fontSize: "11px",
                        }}>REOPEN</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Pagination ── */}
        {filtered.length > PAGE_SIZE && (
          <div style={{
            padding: "14px 20px", borderTop: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{
              color: "var(--accent3)", fontFamily: "var(--font-mono)", fontSize: "12px",
            }}>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                disabled={page === 0}
                onClick={() => { setPage(p => p - 1); setExpanded(null); }}
                style={{
                  padding: "5px 12px", border: "1px solid var(--border)", borderRadius: "4px",
                  background: "transparent", color: page === 0 ? "var(--accent3)" : "var(--accent)",
                  cursor: page === 0 ? "default" : "pointer",
                  fontFamily: "var(--font-ui)", fontSize: "11px", fontWeight: 600,
                  opacity: page === 0 ? 0.4 : 1,
                }}>◀ PREV</button>
              <button
                disabled={(page + 1) * PAGE_SIZE >= filtered.length}
                onClick={() => { setPage(p => p + 1); setExpanded(null); }}
                style={{
                  padding: "5px 12px", border: "1px solid var(--border)", borderRadius: "4px",
                  background: "transparent",
                  color: (page + 1) * PAGE_SIZE >= filtered.length ? "var(--accent3)" : "var(--accent)",
                  cursor: (page + 1) * PAGE_SIZE >= filtered.length ? "default" : "pointer",
                  fontFamily: "var(--font-ui)", fontSize: "11px", fontWeight: 600,
                  opacity: (page + 1) * PAGE_SIZE >= filtered.length ? 0.4 : 1,
                }}>NEXT ▶</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
