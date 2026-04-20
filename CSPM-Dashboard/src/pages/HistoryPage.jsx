import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SEV_COLOR = {
  CRITICAL: "#b54545", HIGH: "#b06c2a",
  MEDIUM:   "#9a7d18", LOW:  "#3a8a60",
};
const SEV_BG = {
  CRITICAL: "rgba(181,69,69,0.08)",
  HIGH:     "rgba(176,108,42,0.08)",
  MEDIUM:   "rgba(154,125,24,0.08)",
  LOW:      "rgba(58,138,96,0.08)",
};

function scoreColor(s) {
  if (s >= 80) return "#3a8a60";
  if (s >= 60) return "#9a7d18";
  if (s >= 40) return "#b06c2a";
  return "#b54545";
}
function scoreLabel(s) {
  if (s >= 80) return "Low";
  if (s >= 60) return "Med";
  if (s >= 40) return "High";
  return "Critical";
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

const inputStyle = {
  background: "#fff", border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 6, padding: "7px 10px", color: "rgba(0,0,0,0.9)",
  fontFamily: "var(--font-ui)", fontSize: 12,
  letterSpacing: "-0.006em", outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

function SevChip({ label, active, onClick }) {
  const c = SEV_COLOR[label] || "#a39e98";
  const bg = SEV_BG[label]  || "rgba(0,0,0,0.05)";
  return (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 700,
      fontFamily: "var(--font-ui)", letterSpacing: "0.04em",
      cursor: "pointer", transition: "all 0.12s",
      background: active ? bg      : "transparent",
      border:     active ? `1px solid ${c}50` : "1px solid rgba(0,0,0,0.1)",
      color:      active ? c       : "#a39e98",
    }}>{label}</button>
  );
}

function CloudChip({ label, active, onClick }) {
  const clr = label === "all" ? "#4b7bc9" : label === "aws" ? "#b87a2a" : "#3a7ab0";
  return (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 700,
      fontFamily: "var(--font-ui)", letterSpacing: "0.04em",
      cursor: "pointer", transition: "all 0.12s",
      background: active ? `${clr}14` : "transparent",
      border:     active ? `1px solid ${clr}50` : "1px solid rgba(0,0,0,0.1)",
      color:      active ? clr       : "#a39e98",
    }}>{label === "all" ? "All clouds" : label.toUpperCase()}</button>
  );
}

export default function HistoryPage({ token, role }) {
  const [scans,        setScans]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState(null);
  const [selected,     setSelected]    = useState(null);
  const [fullScans,    setFullScans]   = useState({});
  const [diffTab,      setDiffTab]     = useState({});

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [cloudFilter,   setCloudFilter]   = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [scanSearch,    setScanSearch]    = useState("");
  const [sevFilter,     setSevFilter]     = useState(new Set()); // client-side


  // ── Fetch — re-fires when server-side filters change ────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const p = new URLSearchParams({ limit: "200" });
        if (dateFrom)               p.set("date_from", dateFrom);
        if (dateTo)                 p.set("date_to",   dateTo);
        if (cloudFilter !== "all")  p.set("cloud",     cloudFilter);
        if (accountFilter !== "all") p.set("account_id", accountFilter);

        const res = await fetch(`${API}/scans?${p}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setScans(data.scans || []);
          setSelected(null);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.detail || "Failed to load scan history.");
        }
      } catch {
        if (!cancelled) setError("Cannot reach the backend server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token, dateFrom, dateTo, cloudFilter, accountFilter]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const uniqueAccounts = [...new Map(
    scans.filter(s => s.account_id && s.account_name)
      .map(s => [s.account_id, { id: s.account_id, name: s.account_name }])
  ).values()];

  const displayedScans = scans.filter(scan => {
    if (scanSearch && !(scan.account_name || "").toLowerCase().includes(scanSearch.toLowerCase())) return false;
    if (sevFilter.size > 0) {
      const fc = scan.finding_counts || {};
      const hasMatch = [...sevFilter].some(sev => (fc[sev.toLowerCase()] || 0) > 0);
      if (!hasMatch) return false;
    }
    return true;
  });

  const chartData = [...scans].reverse().map(scan => ({
    name:    fmtTs(scan.created_at),
    account: scan.account_name || "Ad-hoc",
    overall: (scan.scores || {}).overall,
    aws:     (scan.scores || {}).aws,
    azure:   (scan.scores || {}).azure,
  }));
  const hasAWS     = chartData.some(d => d.aws    != null);
  const hasAzure   = chartData.some(d => d.azure  != null);
  const hasOverall = chartData.some(d => d.overall != null);

  const totalScans    = scans.length;
  const latestScan    = scans[0];
  const latestScore   = latestScan
    ? (latestScan.scores?.overall ?? latestScan.scores?.aws ?? latestScan.scores?.azure)
    : null;
  const totalCritical = scans.reduce((a, s) => a + (s.finding_counts?.critical || 0), 0);


  // ── Loading / error / empty ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                  height:"60vh", gap:10, color:"#a39e98",
                  fontFamily:"var(--font-ui)", fontSize:13 }}>
      <span style={{ width:13, height:13, borderRadius:"50%", display:"inline-block",
                     border:"2px solid rgba(0,0,0,0.1)", borderTopColor:"#4b7bc9",
                     animation:"spin 0.7s linear infinite" }} />
      Loading history…
    </div>
  );

  if (error) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                  height:"60vh", flexDirection:"column", gap:12 }}>
      <div style={{ color:"#b54545", fontFamily:"var(--font-ui)", fontSize:14, fontWeight:600 }}>
        History unavailable
      </div>
      <div style={{ color:"#a39e98", fontSize:13, fontFamily:"var(--font-ui)",
                    textAlign:"center", maxWidth:420 }}>{error}</div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:"28px 32px 60px", maxWidth:1100, margin:"0 auto",
                  animation:"floatIn 0.28s cubic-bezier(0.23,1,0.32,1) both" }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:700,
                     color:"rgba(0,0,0,0.9)", letterSpacing:"-0.03em",
                     margin:0, lineHeight:1.2 }}>Scan History</h1>
        <p style={{ color:"#a39e98", fontSize:13, marginTop:4, margin:0,
                    fontFamily:"var(--font-ui)", letterSpacing:"-0.006em" }}>
          Showing {displayedScans.length} of {totalScans} scans for your team's accounts
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────────── */}
      {scans.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
                      gap:12, marginBottom:20 }}>
          {[
            { label:"Total Scans",    value: totalScans,
              color: "rgba(0,0,0,0.9)" },
            { label:"Latest Score",   value: latestScore != null ? latestScore : "—",
              color: latestScore != null ? scoreColor(latestScore) : "#a39e98" },
            { label:"Total Critical", value: totalCritical,
              color: totalCritical > 0 ? "#b54545" : "#3a8a60" },
            { label:"Latest Cloud",   value: (latestScan?.cloud || "—").toUpperCase(),
              color: latestScan?.cloud === "aws" ? "#b87a2a" : "#3a7ab0" },
          ].map((s, i) => (
            <div key={s.label} style={{
              background:"#fff", border:"1px solid rgba(0,0,0,0.09)",
              borderRadius:10, padding:"14px 16px",
              boxShadow:"rgba(0,0,0,0.03) 0px 2px 8px",
            }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:26,
                            fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ color:"#a39e98", fontSize:10, letterSpacing:"0.04em",
                            marginTop:4, fontFamily:"var(--font-ui)",
                            textTransform:"uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Trend chart ────────────────────────────────────────────────────────── */}
      {scans.length > 1 && (
        <div style={{
          background:"#fff", border:"1px solid rgba(0,0,0,0.09)",
          borderRadius:10, padding:"18px 22px", marginBottom:20,
          boxShadow:"rgba(0,0,0,0.03) 0px 2px 8px",
        }}>
          <div style={{ fontFamily:"var(--font-ui)", fontSize:11, fontWeight:600,
                        color:"#a39e98", letterSpacing:"0.04em", textTransform:"uppercase",
                        marginBottom:14 }}>Risk score trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="name"
                tick={{ fill:"#a39e98", fontSize:10, fontFamily:"var(--font-ui)" }}
                axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]}
                tick={{ fill:"#a39e98", fontSize:10, fontFamily:"var(--font-ui)" }}
                axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background:"#fff", border:"1px solid rgba(0,0,0,0.1)",
                                borderRadius:6, fontFamily:"var(--font-ui)", fontSize:12 }}
                labelStyle={{ color:"rgba(0,0,0,0.7)", fontFamily:"var(--font-ui)" }}
              />
              <Legend wrapperStyle={{ fontFamily:"var(--font-ui)", fontSize:12, color:"#a39e98" }} />
              {hasAWS    && <Line type="monotone" dataKey="aws"
                name="AWS" stroke="#b87a2a" strokeWidth={2} dot={{ r:3 }} connectNulls />}
              {hasAzure  && <Line type="monotone" dataKey="azure"
                name="Azure" stroke="#3a7ab0" strokeWidth={2} dot={{ r:3 }} connectNulls />}
              {hasOverall && <Line type="monotone" dataKey="overall"
                name="Overall" stroke="#4b7bc9" strokeWidth={2}
                dot={{ r:3 }} strokeDasharray="4 2" connectNulls />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Scan log ───────────────────────────────────────────────────────────── */}
      <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.09)",
                    borderRadius:10, overflow:"hidden",
                    boxShadow:"rgba(0,0,0,0.03) 0px 2px 8px" }}>

        {/* Filter bar */}
        <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(0,0,0,0.07)",
                      display:"flex", flexWrap:"wrap", gap:10, alignItems:"flex-end" }}>

          {/* Date range */}
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:"var(--font-ui)", fontSize:10, color:"#a39e98",
                            letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:4 }}>From</div>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ ...inputStyle, width:130 }}
                onFocus={e => { e.target.style.borderColor="#4b7bc9"; e.target.style.boxShadow="0 0 0 3px rgba(75,123,201,0.12)"; }}
                onBlur={e  => { e.target.style.borderColor="rgba(0,0,0,0.12)"; e.target.style.boxShadow="none"; }}
              />
            </div>
            <span style={{ color:"#a39e98", fontSize:12, marginTop:18 }}>—</span>
            <div>
              <div style={{ fontFamily:"var(--font-ui)", fontSize:10, color:"#a39e98",
                            letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:4 }}>To</div>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ ...inputStyle, width:130 }}
                onFocus={e => { e.target.style.borderColor="#4b7bc9"; e.target.style.boxShadow="0 0 0 3px rgba(75,123,201,0.12)"; }}
                onBlur={e  => { e.target.style.borderColor="rgba(0,0,0,0.12)"; e.target.style.boxShadow="none"; }}
              />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{
                marginTop:18, padding:"5px 8px", borderRadius:5, fontSize:11,
                fontFamily:"var(--font-ui)", cursor:"pointer",
                border:"1px solid rgba(0,0,0,0.1)", background:"transparent",
                color:"#a39e98", transition:"all 0.12s",
              }}
                onMouseEnter={e => e.currentTarget.style.color="#b54545"}
                onMouseLeave={e => e.currentTarget.style.color="#a39e98"}
              >✕</button>
            )}
          </div>

          {/* Account dropdown */}
          {uniqueAccounts.length > 1 && (
            <div>
              <div style={{ fontFamily:"var(--font-ui)", fontSize:10, color:"#a39e98",
                            letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:4 }}>Account</div>
              <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)}
                style={{ ...inputStyle, paddingRight:28, cursor:"pointer" }}>
                <option value="all">All accounts</option>
                {uniqueAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cloud filter */}
          <div>
            <div style={{ fontFamily:"var(--font-ui)", fontSize:10, color:"#a39e98",
                          letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:4 }}>Cloud</div>
            <div style={{ display:"flex", gap:4 }}>
              {["all","aws","azure"].map(c => (
                <CloudChip key={c} label={c} active={cloudFilter === c}
                  onClick={() => setCloudFilter(c)} />
              ))}
            </div>
          </div>

          {/* Severity filter (client-side) */}
          <div>
            <div style={{ fontFamily:"var(--font-ui)", fontSize:10, color:"#a39e98",
                          letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:4 }}>Severity</div>
            <div style={{ display:"flex", gap:4 }}>
              {["CRITICAL","HIGH","MEDIUM","LOW"].map(s => (
                <SevChip key={s} label={s} active={sevFilter.has(s)}
                  onClick={() => setSevFilter(prev => {
                    const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n;
                  })}
                />
              ))}
            </div>
          </div>

          {/* Search */}
          <div style={{ marginLeft:"auto" }}>
            <div style={{ fontFamily:"var(--font-ui)", fontSize:10, color:"#a39e98",
                          letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:4 }}>Search</div>
            <input
              value={scanSearch} onChange={e => setScanSearch(e.target.value)}
              placeholder="Account name…"
              style={{ ...inputStyle, width:150 }}
              onFocus={e => { e.target.style.borderColor="#4b7bc9"; e.target.style.boxShadow="0 0 0 3px rgba(75,123,201,0.12)"; }}
              onBlur={e  => { e.target.style.borderColor="rgba(0,0,0,0.12)"; e.target.style.boxShadow="none"; }}
            />
          </div>
        </div>

        {/* Table header */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"170px 140px 70px 70px 60px 60px 60px 60px 100px",
          gap:8, padding:"8px 18px",
          background:"#f6f5f4", borderBottom:"1px solid rgba(0,0,0,0.07)",
          fontFamily:"var(--font-ui)", fontSize:10, fontWeight:600,
          color:"#a39e98", letterSpacing:"0.04em", textTransform:"uppercase",
        }}>
          <span>Timestamp</span><span>Account</span><span>Cloud</span><span>Score</span>
          <span style={{ color:SEV_COLOR.CRITICAL }}>Crit</span>
          <span style={{ color:SEV_COLOR.HIGH }}>High</span>
          <span style={{ color:SEV_COLOR.MEDIUM }}>Med</span>
          <span style={{ color:SEV_COLOR.LOW }}>Low</span>
          <span>Export</span>
        </div>

        {/* Empty states */}
        {scans.length === 0 && (
          <div style={{ padding:"48px 20px", textAlign:"center", color:"#a39e98",
                        fontFamily:"var(--font-ui)", fontSize:13 }}>
            No scans found for this team.{" "}
            {(dateFrom || dateTo || cloudFilter !== "all") &&
              <button onClick={() => { setDateFrom(""); setDateTo(""); setCloudFilter("all"); setAccountFilter("all"); }} style={{
                background:"none", border:"none", color:"#4b7bc9", cursor:"pointer",
                fontFamily:"var(--font-ui)", fontSize:13, textDecoration:"underline",
              }}>Clear filters</button>}
          </div>
        )}
        {scans.length > 0 && displayedScans.length === 0 && (
          <div style={{ padding:"32px 20px", textAlign:"center", color:"#a39e98",
                        fontFamily:"var(--font-ui)", fontSize:13 }}>
            No scans match your current filters.
          </div>
        )}

        {/* Rows */}
        {displayedScans.map((scan, i) => {
          const score   = scan.scores?.overall ?? scan.scores?.aws ?? scan.scores?.azure;
          const fc      = scan.finding_counts || {};
          const isOpen  = selected === i;
          const trigger = scan.triggered_by === "schedule" ? " ⏱" : "";

          return (
            <div key={scan.id || i} style={{ borderTop:"1px solid rgba(0,0,0,0.06)" }}>
              <div
                onClick={async () => {
                  if (isOpen) { setSelected(null); return; }
                  setSelected(i);
                  if (scan.id && !fullScans[scan.id]) {
                    try {
                      const r = await fetch(`${API}/scans/${scan.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (r.ok) { const d = await r.json(); setFullScans(p => ({ ...p, [scan.id]: d })); }
                    } catch {}
                  }
                }}
                style={{
                  display:"grid",
                  gridTemplateColumns:"170px 140px 70px 70px 60px 60px 60px 60px 100px",
                  gap:8, padding:"11px 18px", cursor:"pointer",
                  background: isOpen ? "#f6f5f4" : i % 2 === 0 ? "#fff" : "rgba(0,0,0,0.01)",
                  transition:"background 0.12s",
                }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background="#f6f5f4"; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background= i%2===0?"#fff":"rgba(0,0,0,0.01)"; }}
              >
                <span style={{ fontFamily:"var(--font-ui)", fontSize:11, color:"#615d59", letterSpacing:"-0.004em" }}>
                  {fmtTs(scan.created_at)}{trigger}
                </span>
                <span style={{ fontFamily:"var(--font-ui)", fontSize:12, color:"rgba(0,0,0,0.9)",
                               fontWeight:600, overflow:"hidden", textOverflow:"ellipsis",
                               whiteSpace:"nowrap", letterSpacing:"-0.006em" }}>
                  {scan.account_name || "Ad-hoc"}
                </span>
                <span style={{
                  fontSize:10, fontWeight:700, letterSpacing:"0.04em",
                  color: scan.cloud === "aws" ? "#b87a2a" : "#3a7ab0",
                  fontFamily:"var(--font-ui)",
                }}>{(scan.cloud || "—").toUpperCase()}</span>
                <span style={{ color: score != null ? scoreColor(score) : "#a39e98",
                               fontWeight:700, fontFamily:"var(--font-display)", fontSize:15,
                               letterSpacing:"-0.02em" }}>
                  {score ?? "—"}
                </span>
                <span style={{ color:SEV_COLOR.CRITICAL, fontFamily:"var(--font-ui)",
                               fontSize:12, fontWeight: fc.critical > 0 ? 700 : 400 }}>
                  {fc.critical ?? 0}
                </span>
                <span style={{ color:SEV_COLOR.HIGH, fontFamily:"var(--font-ui)",
                               fontSize:12, fontWeight: fc.high > 0 ? 700 : 400 }}>
                  {fc.high ?? 0}
                </span>
                <span style={{ color:SEV_COLOR.MEDIUM, fontFamily:"var(--font-ui)", fontSize:12 }}>
                  {fc.medium ?? 0}
                </span>
                <span style={{ color:SEV_COLOR.LOW, fontFamily:"var(--font-ui)", fontSize:12 }}>
                  {fc.low ?? 0}
                </span>
                {/* Per-scan download buttons */}
                <div style={{ display:"flex", gap:4 }} onClick={e => e.stopPropagation()}>
                  {["csv","json"].map(fmt => (
                    <button key={fmt} onClick={async () => {
                      try {
                        const res = await fetch(`${API}/scans/${scan.id}/report?format=${fmt}`, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!res.ok) return;
                        const blob = await res.blob();
                        const url  = URL.createObjectURL(blob);
                        const a    = document.createElement("a");
                        a.href = url;
                        a.download = `cspm-${(scan.account_name||"scan").replace(/\s+/g,"-")}-${(scan.created_at||"").slice(0,10)}.${fmt}`;
                        a.click(); URL.revokeObjectURL(url);
                      } catch {}
                    }} style={{
                      padding:"3px 7px", fontSize:9, fontWeight:700,
                      fontFamily:"var(--font-ui)", letterSpacing:"0.04em",
                      border:"1px solid rgba(0,0,0,0.1)", borderRadius:4,
                      background:"transparent", cursor:"pointer", color:"#a39e98",
                      transition:"all 0.1s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.color="#4b7bc9"; e.currentTarget.style.borderColor="rgba(75,123,201,0.4)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color="#a39e98"; e.currentTarget.style.borderColor="rgba(0,0,0,0.1)"; }}
                    >↓{fmt.toUpperCase()}</button>
                  ))}
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ padding:"14px 18px 18px", background:"#f6f5f4",
                              borderTop:"1px solid rgba(0,0,0,0.07)" }}>

                  {/* Score breakdown */}
                  <div style={{ display:"flex", gap:24, flexWrap:"wrap", marginBottom:14 }}>
                    {scan.scores && Object.entries(scan.scores).map(([cl, s]) => (
                      <div key={cl} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:22, fontWeight:700,
                                      fontFamily:"var(--font-display)",
                                      color:scoreColor(s), letterSpacing:"-0.03em" }}>{s}</div>
                        <div style={{ fontSize:10, color:"#a39e98", fontFamily:"var(--font-ui)",
                                      letterSpacing:"0.04em", marginTop:2, textTransform:"uppercase" }}>
                          {cl}
                        </div>
                        <div style={{ fontSize:9, color:scoreColor(s), fontFamily:"var(--font-ui)",
                                      letterSpacing:"0.04em" }}>
                          {scoreLabel(s)} risk
                        </div>
                      </div>
                    ))}
                    <div style={{ color:"#a39e98", fontSize:11, fontFamily:"var(--font-ui)",
                                  alignSelf:"center", letterSpacing:"-0.006em" }}>
                      {scan.resources_scanned ?? 0} resources ·{" "}
                      {scan.triggered_by === "schedule" ? "auto-scan" : "manual"}
                    </div>
                  </div>

                  {/* Diff + findings tabs */}
                  {(() => {
                    const full = fullScans[scan.id];
                    if (!full) return (
                      <div style={{ color:"#a39e98", fontSize:12,
                                    fontFamily:"var(--font-ui)" }}>Loading details…</div>
                    );
                    const diff     = full.diff;
                    const tab      = diffTab[scan.id] || "all";
                    const findings = full.findings || [];
                    return (
                      <div>
                        {diff && (
                          <div style={{ display:"flex", alignItems:"center", gap:12,
                                        marginBottom:10, padding:"8px 12px", borderRadius:6,
                                        background:"#fff", border:"1px solid rgba(0,0,0,0.09)" }}>
                            {diff.new_count > 0 && (
                              <span style={{ color:"#b54545", fontSize:12,
                                             fontFamily:"var(--font-ui)", fontWeight:700 }}>
                                +{diff.new_count} new
                              </span>
                            )}
                            {diff.resolved_count > 0 && (
                              <span style={{ color:"#3a8a60", fontSize:12,
                                             fontFamily:"var(--font-ui)", fontWeight:700 }}>
                                ✓ {diff.resolved_count} resolved
                              </span>
                            )}
                            {diff.new_count === 0 && diff.resolved_count === 0 && (
                              <span style={{ color:"#a39e98", fontSize:12, fontFamily:"var(--font-ui)" }}>
                                No changes since previous scan
                              </span>
                            )}
                            <span style={{ color:"#a39e98", fontSize:11, fontFamily:"var(--font-ui)",
                                           marginLeft:"auto", letterSpacing:"-0.006em" }}>
                              vs {fmtTs(diff.previous_scan_date)}
                            </span>
                          </div>
                        )}

                        <div style={{ display:"flex", gap:4, marginBottom:10 }}>
                          {(diff ? ["all","changes"] : ["all"]).map(t => (
                            <button key={t}
                              onClick={() => setDiffTab(p => ({ ...p, [scan.id]: t }))}
                              style={{
                                padding:"4px 10px", borderRadius:6, fontSize:10,
                                fontFamily:"var(--font-ui)", fontWeight:700,
                                letterSpacing:"0.04em", cursor:"pointer",
                                background: tab === t ? "rgba(75,123,201,0.1)" : "#fff",
                                border: tab === t ? "1px solid rgba(75,123,201,0.3)"
                                                  : "1px solid rgba(0,0,0,0.1)",
                                color: tab === t ? "#4b7bc9" : "#a39e98",
                                transition:"all 0.12s",
                              }}>
                              {t === "all" ? `All findings (${findings.length})` : "Changes"}
                            </button>
                          ))}
                        </div>

                        {tab === "all" && (
                          <div style={{ maxHeight:300, overflowY:"auto" }}>
                            {findings.length === 0 ? (
                              <div style={{ color:"#a39e98", fontSize:12,
                                            fontFamily:"var(--font-ui)", padding:"8px 0" }}>
                                No findings for this scan.
                              </div>
                            ) : findings.map((f, fi) => (
                              <div key={fi} style={{
                                padding:"7px 10px", marginBottom:4, borderRadius:6,
                                background:"#fff", border:`1px solid ${SEV_COLOR[f.severity] || "#a39e98"}22`,
                              }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{
                                    fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4,
                                    fontFamily:"var(--font-ui)", letterSpacing:"0.04em",
                                    background: SEV_BG[f.severity] || "rgba(0,0,0,0.05)",
                                    color: SEV_COLOR[f.severity] || "#a39e98",
                                  }}>{f.severity}</span>
                                  <span style={{ color:"rgba(0,0,0,0.8)", fontSize:11,
                                                 fontFamily:"var(--font-ui)", fontWeight:600 }}>
                                    {f.rule_id}
                                  </span>
                                  {f.service && (
                                    <span style={{ fontSize:10, color:"#a39e98",
                                                   fontFamily:"var(--font-ui)", letterSpacing:"-0.006em" }}>
                                      · {f.service}
                                    </span>
                                  )}
                                  <span style={{ color:"#615d59", fontSize:11,
                                                 fontFamily:"var(--font-ui)", marginLeft:"auto",
                                                 letterSpacing:"-0.006em" }}>
                                    {f.resource_name}
                                  </span>
                                </div>
                                {f.message && (
                                  <div style={{ color:"#a39e98", fontSize:10,
                                                fontFamily:"var(--font-ui)", marginTop:3,
                                                paddingLeft:2, letterSpacing:"-0.004em" }}>
                                    {f.message}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {tab === "changes" && diff && (
                          <div style={{ maxHeight:300, overflowY:"auto" }}>
                            {diff.new_findings.map((f, fi) => (
                              <div key={`n-${fi}`} style={{
                                padding:"7px 10px", marginBottom:4, borderRadius:6,
                                background:"rgba(181,69,69,0.04)",
                                border:"1px solid rgba(181,69,69,0.15)",
                              }}>
                                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                  <span style={{ color:"#b54545", fontSize:9, fontWeight:700,
                                                 fontFamily:"var(--font-ui)" }}>+ NEW</span>
                                  <span style={{ color:SEV_COLOR[f.severity]||"#a39e98",
                                                 fontSize:9, fontWeight:700,
                                                 fontFamily:"var(--font-ui)" }}>{f.severity}</span>
                                  <span style={{ color:"rgba(0,0,0,0.8)", fontSize:11,
                                                 fontFamily:"var(--font-ui)" }}>{f.rule_id}</span>
                                  <span style={{ color:"#615d59", fontSize:11,
                                                 fontFamily:"var(--font-ui)", marginLeft:"auto" }}>
                                    {f.resource_name}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {diff.resolved_findings.map((f, fi) => (
                              <div key={`r-${fi}`} style={{
                                padding:"7px 10px", marginBottom:4, borderRadius:6,
                                background:"rgba(58,138,96,0.04)",
                                border:"1px solid rgba(58,138,96,0.15)",
                                opacity:0.7,
                              }}>
                                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                  <span style={{ color:"#3a8a60", fontSize:9, fontWeight:700,
                                                 fontFamily:"var(--font-ui)" }}>✓ RESOLVED</span>
                                  <span style={{ color:"rgba(0,0,0,0.5)", fontSize:11,
                                                 fontFamily:"var(--font-ui)",
                                                 textDecoration:"line-through" }}>{f.rule_id}</span>
                                  <span style={{ color:"#a39e98", fontSize:11,
                                                 fontFamily:"var(--font-ui)", marginLeft:"auto",
                                                 textDecoration:"line-through" }}>
                                    {f.resource_name}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {diff.new_findings.length === 0 && diff.resolved_findings.length === 0 && (
                              <div style={{ color:"#a39e98", fontSize:12,
                                            fontFamily:"var(--font-ui)", padding:"8px 0" }}>
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
