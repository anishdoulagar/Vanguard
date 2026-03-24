import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SEV_COLOR = {
  CRITICAL: "#e05555", HIGH: "#d97b3a",
  MEDIUM:   "#c9a84c", LOW:  "#4caf7d",
};

function scoreColor(s) {
  if (s >= 80) return "#4caf7d";
  if (s >= 60) return "#c9a84c";
  if (s >= 40) return "#d97b3a";
  return "#e05555";
}

function scoreLabel(s) {
  if (s >= 80) return "LOW";
  if (s >= 60) return "MED";
  if (s >= 40) return "HIGH";
  return "CRIT";
}

function fmtTs(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return isoStr.slice(0, 16).replace("T", " ");
  }
}

export default function HistoryPage({ token, role }) {
  const [scans,    setScans]    = useState([]);
  const [loading,      setLoading]    = useState(true);
  const [error,        setError]      = useState(null);
  const [selected,     setSelected]   = useState(null);
  const [fullScans,    setFullScans]  = useState({});
  const [diffTab,      setDiffTab]    = useState({});
  const [scanSearch,   setScanSearch] = useState("");
  const [cloudFilter,  setCloudFilter]= useState("all");

  useEffect(() => {
    async function fetchScans() {
      try {
        const res  = await fetch(`${API}/scans?limit=30`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setScans(data.scans || []);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.detail || "Failed to load scan history.");
        }
      } catch {
        setError("Cannot reach the backend server. Please check your connection.");
      }
      finally { setLoading(false); }
    }
    fetchScans();
  }, [token]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                  height:"60vh", flexDirection:"column", gap:"16px" }}>
      <div style={{ width:"28px", height:"28px", border:"2px solid var(--border)",
                    borderTop:"2px solid var(--accent)", borderRadius:"50%",
                    animation:"spin 0.8s linear infinite" }} />
      <span style={{ color:"var(--accent3)", fontFamily:"var(--font-mono)",
                     fontSize:"12px", letterSpacing:"0.1em" }}>
        LOADING HISTORY...
      </span>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                  height:"60vh", flexDirection:"column", gap:"12px" }}>
      <div style={{ color:"#e05555", fontFamily:"var(--font-display)",
                    fontSize:"16px", fontWeight:700 }}>⚠ HISTORY UNAVAILABLE</div>
      <div style={{ color:"var(--accent3)", fontSize:"13px", fontFamily:"var(--font-mono)",
                    textAlign:"center", maxWidth:"420px" }}>{error}</div>
    </div>
  );

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (scans.length === 0) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                  height:"60vh", flexDirection:"column", gap:"12px" }}>
      <div style={{ color:"var(--accent)", fontFamily:"var(--font-display)",
                    fontSize:"16px", fontWeight:700 }}>NO SCAN HISTORY</div>
      <div style={{ color:"var(--accent3)", fontSize:"13px" }}>
        Run your first scan to see results here.
      </div>
    </div>
  );

  // ── Build chart data ───────────────────────────────────────────────────────
  const chartData = [...scans].reverse().map(scan => {
    const scores = scan.scores || {};
    return {
      name:    fmtTs(scan.created_at),
      account: scan.account_name || "Ad-hoc",
      overall: scores.overall,
      aws:     scores.aws,
      azure:   scores.azure,
    };
  });

  const hasAWS     = chartData.some(d => d.aws    != null);
  const hasAzure   = chartData.some(d => d.azure  != null);
  const hasOverall = chartData.some(d => d.overall != null);

  // Aggregate stats
  const totalScans    = scans.length;
  const latestScan    = scans[0];
  const latestScore   = latestScan
    ? (latestScan.scores?.overall ?? latestScan.scores?.aws ?? latestScan.scores?.azure)
    : null;
  const totalCritical = scans.reduce((acc, s) =>
    acc + (s.finding_counts?.critical || 0), 0);

  return (
    <div style={{ padding:"32px", maxWidth:"1200px", margin:"0 auto",
                  animation:"fadeIn 0.3s ease" }}>

      {/* Header */}
      <h1 style={{ fontFamily:"var(--font-display)", fontSize:"22px", fontWeight:700,
                   color:"var(--accent)", letterSpacing:"0.05em",
                   marginBottom:"24px" }}>SCAN HISTORY</h1>

      {/* Stat Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
                    gap:"12px", marginBottom:"24px" }}>
        {[
          { label:"TOTAL SCANS",    value: totalScans,
            color:"var(--accent)" },
          { label:"LATEST SCORE",   value: latestScore,
            color: latestScore != null ? scoreColor(latestScore) : "var(--accent3)" },
          { label:"TOTAL CRITICAL", value: totalCritical,
            color: totalCritical > 0 ? "var(--red)" : "var(--green)" },
          { label:"LATEST CLOUD",   value: (latestScan?.cloud || "—").toUpperCase(),
            color:"var(--accent2)" },
        ].map(s => (
          <div key={s.label} style={{
            background:"var(--card)", border:"1px solid var(--border)",
            borderRadius:"8px", padding:"16px",
          }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:"28px",
                          fontWeight:700, color:s.color }}>{s.value ?? "—"}</div>
            <div style={{ color:"var(--accent3)", fontSize:"10px",
                          letterSpacing:"0.1em", marginTop:"3px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      {scans.length > 1 && (
        <div style={{ background:"var(--card)", border:"1px solid var(--border)",
                      borderRadius:"10px", padding:"20px 24px",
                      marginBottom:"24px" }}>
          <div style={{ color:"var(--accent3)", fontSize:"11px",
                        letterSpacing:"0.1em", marginBottom:"16px",
                        fontFamily:"var(--font-ui)", fontWeight:600 }}>
            RISK SCORE TREND
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2026" vertical={false} />
              <XAxis dataKey="name"
                tick={{ fill:"#606068", fontSize:10, fontFamily:"var(--font-ui)" }}
                axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]}
                tick={{ fill:"#606068", fontSize:11 }}
                axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background:"#18191d", border:"1px solid #2a2d35",
                                borderRadius:"6px" }}
                labelStyle={{ color:"#e8e8e8", fontFamily:"var(--font-ui)" }}
              />
              <Legend wrapperStyle={{ fontFamily:"var(--font-ui)", fontSize:"12px",
                                      color:"var(--accent2)" }} />
              {hasAWS    && <Line type="monotone" dataKey="aws"
                name="AWS" stroke="#ff9900" strokeWidth={2}
                dot={{ r:3 }} connectNulls />}
              {hasAzure  && <Line type="monotone" dataKey="azure"
                name="Azure" stroke="#0089d6" strokeWidth={2}
                dot={{ r:3 }} connectNulls />}
              {hasOverall && <Line type="monotone" dataKey="overall"
                name="Overall" stroke="#e8e8e8" strokeWidth={2}
                dot={{ r:3 }} strokeDasharray="4 2" connectNulls />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scan Log */}
      <div style={{ background:"var(--card)", border:"1px solid var(--border)",
                    borderRadius:"10px", overflow:"hidden" }}>
        <div style={{ padding:"12px 20px", borderBottom:"1px solid var(--border)",
                      display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ color:"var(--accent)", fontFamily:"var(--font-display)",
                         fontSize:"14px", fontWeight:700, letterSpacing:"0.05em" }}>
            SCAN LOG
          </span>
          <input
            value={scanSearch}
            onChange={e => setScanSearch(e.target.value)}
            placeholder="Search account..."
            style={{
              background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:5, padding:"5px 10px", color:"var(--accent)",
              fontFamily:"var(--font-mono)", fontSize:11, width:160, marginLeft:"auto",
            }}
          />
          <div style={{ display:"flex", gap:4 }}>
            {["all","aws","azure"].map(c => (
              <button key={c} onClick={() => setCloudFilter(c)} style={{
                padding:"4px 10px", borderRadius:4, fontSize:10,
                fontFamily:"var(--font-ui)", fontWeight:700, letterSpacing:"0.07em",
                cursor:"pointer", border:"1px solid var(--border)",
                background: cloudFilter === c ? "rgba(255,230,0,0.1)" : "transparent",
                color: cloudFilter === c ? "var(--cyan)" : "var(--accent3)",
                textTransform:"uppercase",
              }}>{c === "all" ? "ALL" : c.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* Table header */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"170px 100px 70px 80px 60px 60px 60px 60px 100px",
          gap:"10px", padding:"8px 20px",
          background:"var(--surface)", fontSize:"10px",
          color:"var(--accent3)", letterSpacing:"0.1em",
          fontFamily:"var(--font-ui)", fontWeight:600,
          borderBottom:"1px solid var(--border)",
        }}>
          <span>TIMESTAMP</span>
          <span>ACCOUNT</span>
          <span>CLOUD</span>
          <span>SCORE</span>
          <span style={{ color:SEV_COLOR.CRITICAL }}>CRIT</span>
          <span style={{ color:SEV_COLOR.HIGH }}>HIGH</span>
          <span style={{ color:SEV_COLOR.MEDIUM }}>MED</span>
          <span style={{ color:SEV_COLOR.LOW }}>LOW</span>
          <span>EXPORT</span>
        </div>

        {scans.filter(scan => {
          if (cloudFilter !== "all" && scan.cloud !== cloudFilter) return false;
          if (scanSearch && !(scan.account_name || "").toLowerCase().includes(scanSearch.toLowerCase())) return false;
          return true;
        }).map((scan, i) => {
          const score  = scan.scores?.overall ?? scan.scores?.aws ?? scan.scores?.azure;
          const fc     = scan.finding_counts || {};
          const isOpen = selected === i;
          const ts     = fmtTs(scan.created_at);
          const trigger = scan.triggered_by === "schedule" ? "⏱" : "";

          return (
            <div key={scan.id || i} style={{ borderTop:"1px solid var(--border)" }}>
              <div
                onClick={async () => {
                  if (isOpen) { setSelected(null); return; }
                  setSelected(i);
                  const sid = scan.id;
                  if (sid && !fullScans[sid]) {
                    try {
                      const r = await fetch(`${API}/scans/${sid}`, {
                        headers: { "Authorization": `Bearer ${token}` },
                      });
                      if (r.ok) {
                        const d = await r.json();
                        setFullScans(p => ({ ...p, [sid]: d }));
                      }
                    } catch {}
                  }
                }}
                style={{
                  display:"grid",
                  gridTemplateColumns:"170px 100px 70px 80px 60px 60px 60px 60px 100px",
                  gap:"10px", padding:"12px 20px", cursor:"pointer",
                  background: isOpen ? "rgba(232,232,232,0.03)" : "transparent",
                  transition:"background 0.15s",
                }}
                onMouseEnter={e => !isOpen && (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => !isOpen && (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"12px",
                               color:"var(--accent2)" }}>
                  {ts} {trigger}
                </span>
                <span style={{ fontFamily:"var(--font-ui)", fontSize:"12px",
                               color:"var(--accent)", overflow:"hidden",
                               textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {scan.account_name || "Ad-hoc"}
                </span>
                <span style={{
                  fontSize:"10px", fontWeight:700, letterSpacing:"0.06em",
                  color: scan.cloud === "aws" ? "#ff9900" : "#0089d6",
                  fontFamily:"var(--font-ui)",
                }}>
                  {(scan.cloud || "—").toUpperCase()}
                </span>
                <span style={{ color: score != null ? scoreColor(score) : "var(--accent3)",
                               fontWeight:700, fontFamily:"var(--font-display)",
                               fontSize:"16px" }}>
                  {score ?? "—"}
                </span>
                <span style={{ color:"var(--red)", fontFamily:"var(--font-mono)",
                               fontSize:"13px", fontWeight:fc.critical > 0 ? 700 : 400 }}>
                  {fc.critical ?? 0}
                </span>
                <span style={{ color:"var(--orange)", fontFamily:"var(--font-mono)",
                               fontSize:"13px", fontWeight:fc.high > 0 ? 700 : 400 }}>
                  {fc.high ?? 0}
                </span>
                <span style={{ color:"var(--yellow)", fontFamily:"var(--font-mono)",
                               fontSize:"13px" }}>
                  {fc.medium ?? 0}
                </span>
                <span style={{ color:"var(--green)", fontFamily:"var(--font-mono)",
                               fontSize:"13px" }}>
                  {fc.low ?? 0}
                </span>
                {/* Download buttons — stop propagation so row doesn't expand */}
                <div style={{ display:"flex", gap:4 }} onClick={e => e.stopPropagation()}>
                  {["csv","json"].map(fmt => (
                    <button key={fmt} onClick={async () => {
                      try {
                        const res = await fetch(`${API}/scans/${scan.id}/report?format=${fmt}`, {
                          headers: { "Authorization": `Bearer ${token}` },
                        });
                        if (!res.ok) return;
                        const blob = await res.blob();
                        const url  = URL.createObjectURL(blob);
                        const a    = document.createElement("a");
                        a.href = url;
                        a.download = `cspm-${(scan.account_name||"scan").replace(/\s+/g,"-")}-${(scan.created_at||"").slice(0,10)}.${fmt}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {}
                    }} style={{
                      padding:"3px 7px", fontSize:"9px", fontWeight:700,
                      fontFamily:"var(--font-ui)", letterSpacing:"0.06em",
                      border:"1px solid var(--border)", borderRadius:3,
                      background:"transparent", cursor:"pointer",
                      color:"var(--accent2)",
                    }}>↓{fmt.toUpperCase()}</button>
                  ))}
                </div>
              </div>

              {/* Expanded: per-cloud scores + diff */}
              {isOpen && (
                <div style={{
                  padding:"12px 20px 16px",
                  background:"rgba(0,0,0,0.2)",
                  borderTop:"1px solid var(--border)",
                }}>
                  {/* Scores row */}
                  <div style={{ display:"flex", gap:"24px", flexWrap:"wrap", marginBottom:12 }}>
                    {scan.scores && Object.entries(scan.scores).map(([cloud, s]) => (
                      <div key={cloud} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:"22px", fontWeight:700,
                                      fontFamily:"var(--font-display)",
                                      color: scoreColor(s) }}>{s}</div>
                        <div style={{ fontSize:"10px", color:"var(--accent3)",
                                      fontFamily:"var(--font-ui)",
                                      letterSpacing:"0.08em", marginTop:"2px" }}>
                          {cloud.toUpperCase()}
                        </div>
                        <div style={{ fontSize:"9px", color:scoreColor(s),
                                      fontFamily:"var(--font-ui)",
                                      letterSpacing:"0.06em" }}>
                          {scoreLabel(s)} RISK
                        </div>
                      </div>
                    ))}
                    <div style={{ color:"var(--accent3)", fontSize:"11px",
                                  fontFamily:"var(--font-mono)", alignSelf:"center" }}>
                      {scan.resources_scanned ?? 0} resources scanned
                      {scan.triggered_by === "schedule" ? " · auto-scan" : " · manual"}
                    </div>
                  </div>

                  {/* Diff + Findings section */}
                  {(() => {
                    const full = fullScans[scan.id];
                    if (!full) return null;
                    const diff = full.diff;
                    const tab  = diffTab[scan.id] || "all";
                    const SEV_C = { CRITICAL:"#ff2255", HIGH:"#ff6b00", MEDIUM:"#ffe600", LOW:"#39ff14" };
                    const findings = full.findings || [];
                    return (
                      <div>
                        {/* Diff banner — only when previous scan exists */}
                        {diff && (
                          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10,
                                        padding:"8px 12px", borderRadius:6,
                                        background:"rgba(255,255,255,0.03)",
                                        border:"1px solid var(--border)" }}>
                            {diff.new_count > 0 && (
                              <span style={{ color:"#ff2255", fontSize:12,
                                             fontFamily:"var(--font-mono)", fontWeight:700 }}>
                                +{diff.new_count} NEW
                              </span>
                            )}
                            {diff.resolved_count > 0 && (
                              <span style={{ color:"#39ff14", fontSize:12,
                                             fontFamily:"var(--font-mono)", fontWeight:700 }}>
                                ✓{diff.resolved_count} RESOLVED
                              </span>
                            )}
                            {diff.new_count === 0 && diff.resolved_count === 0 && (
                              <span style={{ color:"var(--accent3)", fontSize:12,
                                             fontFamily:"var(--font-mono)" }}>
                                No changes since previous scan
                              </span>
                            )}
                            <span style={{ color:"var(--accent3)", fontSize:11,
                                           fontFamily:"var(--font-mono)", marginLeft:"auto" }}>
                              vs {fmtTs(diff.previous_scan_date)}
                            </span>
                          </div>
                        )}

                        {/* Tabs */}
                        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                          {(diff ? ["all","changes"] : ["all"]).map(t => (
                            <button key={t} onClick={() => setDiffTab(p => ({ ...p, [scan.id]: t }))} style={{
                              padding:"4px 10px", borderRadius:4, fontSize:10,
                              fontFamily:"var(--font-ui)", fontWeight:700, letterSpacing:"0.08em",
                              cursor:"pointer", border:"1px solid var(--border)",
                              background: tab === t ? "rgba(255,230,0,0.1)" : "transparent",
                              color: tab === t ? "var(--cyan)" : "var(--accent3)",
                            }}>
                              {t === "all" ? `ALL FINDINGS (${findings.length})` : "CHANGES"}
                            </button>
                          ))}
                        </div>

                        {/* ALL FINDINGS tab */}
                        {tab === "all" && (
                          <div style={{ maxHeight:320, overflowY:"auto" }}>
                            {findings.length === 0 ? (
                              <div style={{ color:"var(--accent3)", fontSize:12,
                                             fontFamily:"var(--font-mono)", padding:"8px 0" }}>
                                No findings for this scan.
                              </div>
                            ) : findings.map((f, fi) => (
                              <div key={fi} style={{ padding:"6px 10px", marginBottom:4,
                                border:`1px solid ${SEV_C[f.severity] || "#888"}22`,
                                borderRadius:5, background:"rgba(255,255,255,0.02)" }}>
                                <span style={{ color:SEV_C[f.severity]||"#888", fontSize:10,
                                               fontFamily:"var(--font-ui)", fontWeight:700,
                                               minWidth:70, display:"inline-block" }}>
                                  {f.severity}
                                </span>
                                <span style={{ color:"var(--accent)", fontSize:11,
                                               fontFamily:"var(--font-mono)", marginLeft:4 }}>
                                  {f.rule_id}
                                </span>
                                <span style={{ color:"var(--accent3)", fontSize:11,
                                               fontFamily:"var(--font-mono)", marginLeft:8 }}>
                                  {f.resource_name}
                                </span>
                                {f.message && (
                                  <div style={{ color:"var(--accent2)", fontSize:10,
                                                fontFamily:"var(--font-mono)", marginTop:2,
                                                paddingLeft:74, opacity:0.8 }}>
                                    {f.message}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CHANGES tab */}
                        {tab === "changes" && diff && (
                          <div style={{ maxHeight:320, overflowY:"auto" }}>
                            {diff.new_findings.length > 0 && (
                              <>
                                <div style={{ fontSize:10, color:"#ff2255", fontFamily:"var(--font-ui)",
                                               fontWeight:700, letterSpacing:"0.1em", marginBottom:6 }}>
                                  NEW ({diff.new_findings.length})
                                </div>
                                {diff.new_findings.map((f, fi) => (
                                  <div key={fi} style={{ padding:"6px 10px", marginBottom:4,
                                    border:"1px solid rgba(255,34,85,0.2)",
                                    borderRadius:5, background:"rgba(255,34,85,0.04)" }}>
                                    <span style={{ color:SEV_C[f.severity]||"#888", fontSize:10,
                                                   fontFamily:"var(--font-ui)", fontWeight:700 }}>
                                      {f.severity}
                                    </span>
                                    <span style={{ color:"var(--accent)", fontSize:12,
                                                   fontFamily:"var(--font-mono)", marginLeft:8 }}>
                                      {f.rule_id}
                                    </span>
                                    <span style={{ color:"var(--accent3)", fontSize:11,
                                                   fontFamily:"var(--font-mono)", marginLeft:8 }}>
                                      {f.resource_name}
                                    </span>
                                  </div>
                                ))}
                              </>
                            )}
                            {diff.resolved_findings.length > 0 && (
                              <>
                                <div style={{ fontSize:10, color:"#39ff14", fontFamily:"var(--font-ui)",
                                               fontWeight:700, letterSpacing:"0.1em",
                                               marginTop:10, marginBottom:6 }}>
                                  RESOLVED ({diff.resolved_findings.length})
                                </div>
                                {diff.resolved_findings.map((f, fi) => (
                                  <div key={fi} style={{ padding:"6px 10px", marginBottom:4,
                                    border:"1px solid rgba(57,255,20,0.15)",
                                    borderRadius:5, background:"rgba(57,255,20,0.03)",
                                    textDecoration:"line-through", opacity:0.6 }}>
                                    <span style={{ color:"var(--accent3)", fontSize:10,
                                                   fontFamily:"var(--font-ui)", fontWeight:700 }}>
                                      {f.severity}
                                    </span>
                                    <span style={{ color:"var(--accent3)", fontSize:12,
                                                   fontFamily:"var(--font-mono)", marginLeft:8 }}>
                                      {f.rule_id}
                                    </span>
                                    <span style={{ color:"var(--accent3)", fontSize:11,
                                                   fontFamily:"var(--font-mono)", marginLeft:8 }}>
                                      {f.resource_name}
                                    </span>
                                  </div>
                                ))}
                              </>
                            )}
                            {diff.new_findings.length === 0 && diff.resolved_findings.length === 0 && (
                              <div style={{ color:"var(--accent3)", fontSize:12,
                                             fontFamily:"var(--font-mono)", padding:"8px 0" }}>
                                No changes since previous scan.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
