import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, LabelList,
  LineChart, Line, Area, AreaChart,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* ── Palette & helpers ──────────────────────────────────────────────────────── */
const S = {
  CRITICAL: { color: "#b54545", bg: "rgba(181,69,69,0.07)",   label: "CRITICAL" },
  HIGH:     { color: "#b06c2a", bg: "rgba(176,108,42,0.07)",  label: "HIGH" },
  MEDIUM:   { color: "#9a7d18", bg: "rgba(154,125,24,0.07)",  label: "MEDIUM" },
  LOW:      { color: "#3a8a60", bg: "rgba(58,138,96,0.07)",   label: "LOW" },
};
const SEV_LIST = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function sColor(s) {
  if (s == null) return "#a39e98";
  return s >= 80 ? "#3a8a60" : s >= 60 ? "#9a7d18" : s >= 40 ? "#b06c2a" : "#b54545";
}
function sLabel(s) {
  if (s == null) return "N/A";
  return s >= 80 ? "LOW RISK" : s >= 60 ? "MED RISK" : s >= 40 ? "HIGH RISK" : "CRITICAL";
}
function svcName(ruleId = "") {
  // AWS-S3-003 → S3, AZURE-STORAGE-001 → STORAGE
  const p = ruleId.split("-");
  if (p.length >= 2) {
    const s = p[1].toUpperCase();
    return { CFG: "Config", CT: "CloudTrail", GD: "GuardDuty", ELB: "ELB", ALB: "ALB" }[s] || s;
  }
  return "OTHER";
}
function ago(iso) {
  if (!iso) return "Never";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/* ── Tooltip ────────────────────────────────────────────────────────────────── */
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 11,
      fontFamily: "var(--font-mono)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }}>
      {label && <div style={{ color: "var(--accent2)", marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "var(--cyan)", fontWeight: 700 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage({ token, role, onScanComplete, onNavigate, isActive }) {
  const canScan = role !== "viewer";

  /* state */
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState(null);
  const [scanning, setScanning]     = useState(null);   // per-account id
  const [bulkScan, setBulkScan]     = useState(false);
  const [toast, setToast]           = useState(null);
  const [range, setRange]           = useState("all");
  const [sevPick, setSevPick]       = useState("ALL");
  const [search, setSearch]         = useState("");
  const [statusPick, setStatusPick] = useState("ALL");
  const [statuses, setStatuses]     = useState({});
  const [openRow, setOpenRow]       = useState(null);
  const [tab, setTab]               = useState("findings"); // findings | services | frameworks
  const lastFetch = useRef(0);

  const flash = (msg, isErr) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 5000);
  };

  /* fetch */
  const load = useCallback(async (r) => {
    lastFetch.current = Date.now();
    setLoading(true); setErr(null);
    const u = r !== "all" ? `${API}/dashboard?days=${r}` : `${API}/dashboard`;
    try {
      const res = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData(await res.json());
      else { const e = await res.json().catch(() => ({})); setErr(e.detail || "Load failed"); }
    } catch { setErr("Cannot reach backend"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(range); }, [load, range]);
  useEffect(() => {
    if (isActive && Date.now() - lastFetch.current > 30000) load(range);
  }, [isActive]);

  /* actions */
  async function scanOne(acc) {
    setScanning(acc.id);
    try {
      const res = await fetch(`${API}/accounts/${acc.id}/scan`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const r = await res.json();
        await load(range); onScanComplete(r);
        flash(`${acc.name} scanned — score ${r.scores?.overall ?? r.scores?.aws ?? r.scores?.azure ?? "?"}`);
      } else {
        const e = await res.json().catch(() => ({}));
        flash(e.detail || "Scan failed", true);
      }
    } catch { flash("Cannot reach backend", true); }
    finally { setScanning(null); }
  }

  async function scanAll() {
    setBulkScan(true);
    try {
      const res = await fetch(`${API}/accounts/scan-all`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (res.ok) {
        await load(range);
        flash(`${d.success_count}/${d.results?.length} scanned${d.fail_count ? ` · ${d.fail_count} failed` : ""}`);
      } else flash(d.detail || "Bulk scan failed", true);
    } catch { flash("Cannot reach backend", true); }
    finally { setBulkScan(false); }
  }

  async function setFindingStatus(f, status) {
    const key = `${f.rule_id}::${f.resource_id}`;
    try {
      const res = await fetch(`${API}/finding-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ finding_key: key, status }),
      });
      if (res.ok) setStatuses(p => ({ ...p, [key]: status }));
    } catch {}
  }

  const getStatus = (f) => statuses[`${f.rule_id}::${f.resource_id}`] || f.status || "open";

  /* derived */
  const d              = data || {};
  const accounts       = d.accounts       || [];
  const findings       = d.recent_findings || [];
  const score          = d.overall_score  ?? null;
  const nAccounts      = d.total_accounts ?? 0;
  const nScanned       = d.scanned_accounts ?? 0;
  const trend          = d.trend          || [];
  const trendAccts     = d.trend_accounts || [];

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    accounts.forEach(a => {
      const fc = a.finding_counts || {};
      c.CRITICAL += fc.critical || 0;
      c.HIGH     += fc.high     || 0;
      c.MEDIUM   += fc.medium   || 0;
      c.LOW      += fc.low      || 0;
    });
    c.TOTAL = c.CRITICAL + c.HIGH + c.MEDIUM + c.LOW;
    return c;
  }, [accounts]);

  const pieData = SEV_LIST.map(s => ({ name: s, value: counts[s], color: S[s].color })).filter(x => x.value > 0);

  const svcMap = useMemo(() => {
    const m = {};
    findings.forEach(f => { const s = f.service || svcName(f.rule_id); m[s] = (m[s] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [findings]);

  // Frameworks from findings
  const fwMap = useMemo(() => {
    const m = {};
    findings.forEach(f => (f.frameworks || []).forEach(fw => {
      const base = fw.split("-")[0]; // CIS, NIST, PCI, etc.
      m[base] = (m[base] || 0) + 1;
    }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [findings]);

  const filtered = useMemo(() => findings.filter(f => {
    if (sevPick !== "ALL" && f.severity !== sevPick) return false;
    if (statusPick !== "ALL" && getStatus(f) !== statusPick) return false;
    if (search) {
      const q = search.toLowerCase();
      return [f.rule_id, f.resource_name, f.message, f.account_name]
        .some(v => (v || "").toLowerCase().includes(q));
    }
    return true;
  }), [findings, sevPick, statusPick, search, statuses]);

  const trendColors = ["#4b7bc9", "#7a9dbf", "#9aafbf", "#b8c8d0", "#d4dce0"];

  /* ── Layout uses a 12-col mental grid ─────────────────────────────────────── */
  const font = (size, weight = 400) => ({
    fontFamily: "var(--font-ui)", fontSize: size, fontWeight: weight,
  });
  const mono = (size) => ({ fontFamily: "var(--font-mono)", fontSize: size });

  return (
    <div style={{ padding: "24px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 9999,
          padding: "10px 18px", borderRadius: 8,
          background: toast.isErr ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${toast.isErr ? "#fecaca" : "#bbf7d0"}`,
          color: toast.isErr ? "#dc2626" : "#16a34a",
          ...mono(12), boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "fadeIn 0.2s ease",
        }}>{toast.msg}</div>
      )}

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, ...font(20, 700), fontFamily: "var(--font-display)",
                       letterSpacing: "-0.03em", color: "rgba(0,0,0,0.9)", lineHeight: 1.2 }}>
            Security Overview
          </h1>
          <div style={{ ...mono(11), color: "var(--accent3)", marginTop: 4 }}>
            {loading ? "Loading..." :
              `${nScanned}/${nAccounts} accounts · ${counts.TOTAL} findings · ${new Date().toLocaleDateString()}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[["all","ALL"],["7","7D"],["30","30D"],["90","90D"]].map(([v, l]) => (
            <button key={v} onClick={() => setRange(v)} style={{
              padding: "5px 11px", borderRadius: 6, ...font(10, 600),
              letterSpacing: "0.07em", cursor: "pointer",
              border: range === v ? "1px solid #0075de" : "1px solid rgba(0,0,0,0.1)",
              background: range === v ? "#0075de" : "transparent",
              color: range === v ? "#ffffff" : "var(--accent3)",
              transition: "border-color 0.15s, background 0.15s, color 0.15s",
            }}>{l}</button>
          ))}
          <button onClick={() => load(range)} disabled={loading} style={{
            padding: "5px 10px", borderRadius: 6, ...font(11, 500),
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--accent3)", cursor: "pointer", opacity: loading ? 0.4 : 1,
            transition: "color 0.15s",
          }}>↻</button>
          {canScan && (
            <>
              <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
              <button onClick={scanAll} disabled={bulkScan || loading}
                style={{
                  padding: "5px 14px", borderRadius: 6, ...font(10, 700),
                  letterSpacing: "0.06em", cursor: bulkScan ? "wait" : "pointer",
                  border: "none", color: "#ffffff",
                  background: "#0075de", opacity: bulkScan ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}>{bulkScan ? "SCANNING…" : "SCAN ALL"}</button>
            </>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {err && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 8,
                      background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.22)",
                      color: "var(--red)", ...mono(12), display: "flex", gap: 8, alignItems: "center" }}>
          ⚠ {err}
          <button onClick={() => setErr(null)} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "var(--red)", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      )}

      {/* ═══════════════════ TOP METRICS (score hero + 4 severity meters) ═══════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14, marginBottom: 14 }}>

        {/* Score hero */}
        <div style={{
          background: "var(--card)", borderRadius: 12,
          boxShadow: "rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.847px, rgba(0,0,0,0.02) 0px 0.8px 2.925px, rgba(0,0,0,0.01) 0px 0.175px 1.04px",
          padding: "24px 28px", display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center", position: "relative",
        }}>
          <div style={{ position: "relative", width: 140, height: 140 }}>
            <svg viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="70" cy="70" r="60" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="70" cy="70" r="60" fill="none"
                stroke={sColor(score)} strokeWidth="10"
                strokeDasharray={`${(score || 0) * 3.77} 377`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1s ease" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 900,
                color: sColor(score), lineHeight: 1,
              }}>{score ?? "—"}</div>
              <div style={{
                ...font(10, 700), letterSpacing: "0.12em", color: sColor(score), marginTop: 4,
              }}>{sLabel(score)}</div>
            </div>
          </div>
          <div style={{ ...font(9, 700), color: "var(--accent3)", letterSpacing: "0.15em", marginTop: 12 }}>
            SECURITY SCORE
          </div>
        </div>

        {/* 4 severity meters + accounts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {/* Accounts card */}
          <div style={{
            background: "var(--card)", borderRadius: 12,
            boxShadow: "rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.847px, rgba(0,0,0,0.02) 0px 0.8px 2.925px, rgba(0,0,0,0.01) 0px 0.175px 1.04px",
            padding: "18px 16px", display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ ...font(9, 700), color: "var(--accent3)", letterSpacing: "0.12em" }}>ACCOUNTS</div>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 900,
              color: "#0075de", lineHeight: 1, margin: "8px 0",
            }}>{nAccounts}</div>
            <div style={{ ...mono(10), color: "var(--accent3)" }}>{nScanned} scanned</div>
            <div style={{ marginTop: 8, height: 3, background: "var(--border)", borderRadius: 2 }}>
              <div style={{ height: "100%", borderRadius: 2, transition: "width 0.6s",
                width: nAccounts > 0 ? `${(nScanned / nAccounts) * 100}%` : "0%",
                background: "#0075de" }} />
            </div>
          </div>

          {/* Severity cards */}
          {SEV_LIST.map(sev => {
            const val = counts[sev];
            const active = sevPick === sev;
            const c = S[sev];
            return (
              <div key={sev} onClick={() => setSevPick(p => p === sev ? "ALL" : sev)}
                style={{
                  background: active ? c.bg : "var(--card)",
                  border: `1px solid ${active ? c.color : "var(--border)"}`,
                  borderRadius: 12, padding: "18px 16px", cursor: "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                }}>
                <div style={{ ...font(9, 700), color: "var(--accent3)", letterSpacing: "0.12em" }}>{sev}</div>
                <div style={{
                  fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 900,
                  color: val > 0 ? c.color : "var(--accent3)", lineHeight: 1, margin: "8px 0",
                }}>{val}</div>
                <div style={{ ...mono(10), color: "var(--accent3)" }}>
                  {counts.TOTAL > 0 ? `${Math.round((val / counts.TOTAL) * 100)}%` : "0%"} of total
                </div>
                <div style={{ marginTop: 8, height: 3, background: "var(--border)", borderRadius: 2 }}>
                  <div style={{ height: "100%", borderRadius: 2, transition: "width 0.6s",
                    width: counts.TOTAL > 0 ? `${(val / counts.TOTAL) * 100}%` : "0%",
                    background: c.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════ MIDDLE ROW: donut + accounts table ═══════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Donut + Top Services side by side inside one panel */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
          display: "grid", gridTemplateColumns: "1fr 1fr",
        }}>
          {/* Donut */}
          <div style={{ padding: "20px 0", borderRight: "1px solid var(--border)" }}>
            <div style={{ padding: "0 18px 10px", ...font(10, 700), color: "var(--accent3)",
                          letterSpacing: "0.12em" }}>RISK DISTRIBUTION</div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                       paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pieData.map((e, i) => (
                      <Cell key={i} fill={e.color}
                        onClick={() => setSevPick(p => p === e.name ? "ALL" : e.name)}
                        style={{ cursor: "pointer" }} />
                    ))}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: "flex", alignItems: "center",
                            justifyContent: "center", color: "var(--accent3)", ...font(12) }}>
                No findings
              </div>
            )}
            {/* Legend */}
            <div style={{ padding: "0 18px" }}>
              {pieData.map(s => (
                <div key={s.name}
                  onClick={() => setSevPick(p => p === s.name ? "ALL" : s.name)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 5,
                    cursor: "pointer",
                    opacity: sevPick !== "ALL" && sevPick !== s.name ? 0.3 : 1,
                    transition: "opacity 0.15s",
                  }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%",
                                background: s.color, flexShrink: 0 }} />
                  <span style={{ ...font(10, 600), color: "var(--accent2)", flex: 1 }}>{s.name}</span>
                  <span style={{ ...mono(11), color: s.color, fontWeight: 700 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Services */}
          <div style={{ padding: 20 }}>
            <div style={{ ...font(10, 700), color: "var(--accent3)", letterSpacing: "0.12em",
                          marginBottom: 14 }}>TOP AFFECTED SERVICES</div>
            {svcMap.length === 0 ? (
              <div style={{ color: "var(--accent3)", ...font(12), padding: "20px 0" }}>No data</div>
            ) : svcMap.map(([name, count]) => {
              const max = svcMap[0]?.[1] || 1;
              return (
                <div key={name} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ ...font(12, 600), color: "var(--accent)" }}>{name}</span>
                    <span style={{ ...mono(11), color: "#0075de", fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2, transition: "width 0.5s",
                      width: `${(count / max) * 100}%`,
                      background: "#0075de",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Account Health */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            padding: "14px 18px", borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ ...font(10, 700), color: "var(--accent3)", letterSpacing: "0.12em" }}>
              ACCOUNT HEALTH
            </span>
            {canScan && (
              <button onClick={scanAll} disabled={bulkScan} style={{
                padding: "4px 10px", borderRadius: 5, ...font(9, 700),
                border: "none", background: "#0075de",
                color: "#ffffff", cursor: bulkScan ? "wait" : "pointer",
                letterSpacing: "0.06em", opacity: bulkScan ? 0.5 : 1,
              }}>{bulkScan ? "…" : "SCAN ALL"}</button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {accounts.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--accent3)", ...font(12) }}>
                No accounts — connect one first
              </div>
            ) : accounts.map(acc => {
              const sc = acc.latest_score;
              const fc = acc.finding_counts || {};
              const total = (fc.critical||0) + (fc.high||0) + (fc.medium||0) + (fc.low||0);
              const isScanning = scanning === acc.id;
              return (
                <div key={acc.id} style={{
                  padding: "12px 18px", borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "center", gap: 14,
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f6f5f4"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                  {/* Cloud indicator */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                    background: acc.cloud === "aws" ? "rgba(255,153,0,0.12)" : "rgba(0,137,214,0.12)",
                    border: `1px solid ${acc.cloud === "aws" ? "rgba(255,153,0,0.3)" : "rgba(0,137,214,0.3)"}`,
                    ...font(10, 800), color: acc.cloud === "aws" ? "#ff9900" : "#0089d6",
                  }}>{acc.cloud.toUpperCase()}</div>

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...font(13, 700), color: "var(--accent)",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {acc.name}
                    </div>
                    <div style={{ ...mono(9), color: "var(--accent3)", marginTop: 1 }}>
                      {acc.region || "global"}
                      {acc.category && acc.category !== "General" ? ` · ${acc.category}` : ""}
                      {` · ${ago(acc.last_scanned_at)}`}
                    </div>
                  </div>

                  {/* Score ring (mini) */}
                  <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
                    <svg viewBox="0 0 40 40" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" strokeWidth="3" />
                      <circle cx="20" cy="20" r="16" fill="none"
                        stroke={sColor(sc)} strokeWidth="3"
                        strokeDasharray={`${(sc || 0) * 1.005} 101`}
                        strokeLinecap="round" />
                    </svg>
                    <div style={{
                      position: "absolute", inset: 0, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800,
                      color: sColor(sc),
                    }}>{sc ?? "—"}</div>
                  </div>

                  {/* Mini severity pills */}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {SEV_LIST.map(sev => {
                      const v = fc[sev.toLowerCase()] || 0;
                      return (
                        <div key={sev} title={sev} style={{
                          minWidth: 24, textAlign: "center", padding: "3px 5px",
                          borderRadius: 4, ...mono(10), fontWeight: 700,
                          color: v > 0 ? S[sev].color : "var(--accent3)",
                          background: v > 0 ? `${S[sev].color}14` : "transparent",
                          border: v > 0 ? `1px solid ${S[sev].color}30` : "1px solid transparent",
                        }}>{v}</div>
                      );
                    })}
                  </div>

                  {/* Scan button */}
                  {canScan && (
                    <button onClick={() => scanOne(acc)} disabled={isScanning || bulkScan}
                      style={{
                        padding: "6px 14px", borderRadius: 6, ...font(9, 700),
                        letterSpacing: "0.06em", cursor: (isScanning || bulkScan) ? "wait" : "pointer",
                        border: "1px solid var(--border)", background: "transparent",
                        color: isScanning ? "var(--accent3)" : "var(--accent2)",
                        transition: "all 0.15s", flexShrink: 0,
                      }}
                      onMouseEnter={e => { if (!isScanning) { e.currentTarget.style.borderColor = "var(--cyan)"; e.currentTarget.style.color = "var(--cyan)"; }}}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--accent2)"; }}
                    >{isScanning ? "…" : "SCAN"}</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════ TREND ═══════════════════ */}
      {trend.length > 1 && (
        <div style={{
          background: "var(--card)", borderRadius: 12,
          boxShadow: "rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.847px, rgba(0,0,0,0.02) 0px 0.8px 2.925px, rgba(0,0,0,0.01) 0px 0.175px 1.04px",
          marginBottom: 14, padding: "16px 18px 8px",
        }}>
          <div style={{ ...font(10, 700), color: "var(--accent3)", letterSpacing: "0.12em",
                        marginBottom: 10 }}>SCORE TREND</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={trend} margin={{ top: 4, right: 16, bottom: 4, left: -16 }}>
              <defs>
                {trendAccts.map((a, i) => (
                  <linearGradient key={a} id={`grad_${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendColors[i % trendColors.length]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={trendColors[i % trendColors.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "var(--accent3)", fontSize: 9 }}
                     axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--accent3)", fontSize: 9 }}
                     axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              {trendAccts.map((a, i) => (
                <Area key={a} type="monotone" dataKey={a} name={a}
                  stroke={trendColors[i % trendColors.length]} strokeWidth={2}
                  fill={`url(#grad_${i})`}
                  dot={false} connectNulls />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ═══════════════════ FINDINGS TABLE ═══════════════════ */}
      <div style={{
        background: "var(--card)", borderRadius: 12,
        boxShadow: "rgba(0,0,0,0.32) 0px 0px 1px, rgba(0,0,0,0.08) 0px 0px 2px, rgba(0,0,0,0.18) 0px 1px 4px",
      }}>
        {/* Toolbar */}
        <div style={{
          padding: "12px 18px", borderBottom: "1px solid var(--border)",
          display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
        }}>
          <span style={{ ...font(10, 700), color: "var(--accent3)", letterSpacing: "0.12em" }}>
            FINDINGS
          </span>
          <span style={{ ...mono(10), color: "var(--accent3)", marginRight: "auto" }}>
            {filtered.length} of {findings.length}
          </span>

          {/* Sev pills */}
          {["ALL", ...SEV_LIST].map(s => {
            const active = sevPick === s;
            const c = S[s]?.color || "var(--cyan)";
            return (
              <button key={s} onClick={() => setSevPick(s)}
                style={{
                  padding: "4px 10px", borderRadius: 5, ...font(9, 700),
                  letterSpacing: "0.06em", cursor: "pointer",
                  border: `1px solid ${active ? c : "var(--border)"}`,
                  background: active ? (s === "ALL" ? "var(--cyan)" : `${c}18`) : "transparent",
                  color: active ? (s === "ALL" ? "var(--bg)" : c) : "var(--accent3)",
                  transition: "all 0.15s",
                }}>{s}</button>
            );
          })}

          <select value={statusPick} onChange={e => setStatusPick(e.target.value)}
            style={{
              padding: "4px 8px", borderRadius: 5, ...font(9, 700),
              background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--accent2)", cursor: "pointer",
            }}>
            <option value="ALL">ALL STATUS</option>
            <option value="open">OPEN</option>
            <option value="acknowledged">ACKNOWLEDGED</option>
            <option value="resolved">RESOLVED</option>
          </select>

          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search rule, resource, account…"
            style={{
              padding: "5px 10px", borderRadius: 5, ...mono(10),
              background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--accent)", width: 220,
            }} />
        </div>

        {/* Rows */}
        <div style={{ maxHeight: 520, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--accent3)", ...font(12) }}>
              {findings.length === 0 ? "No findings — run a scan to see results" : "No matches for current filters"}
            </div>
          ) : filtered.map((f, i) => {
            const key = `${f.rule_id}::${f.resource_id}::${i}`;
            const open = openRow === key;
            const svc = f.service || svcName(f.rule_id);
            const st = getStatus(f);
            return (
              <div key={key}>
                {/* Main row */}
                <div onClick={() => setOpenRow(o => o === key ? null : key)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 70px 130px 80px 24px",
                    gap: 10, alignItems: "center",
                    padding: "10px 18px", cursor: "pointer",
                    borderBottom: open ? "none" : "1px solid var(--border)",
                    transition: "background 0.1s",
                    background: open ? "rgba(79,143,247,0.03)" : "transparent",
                  }}
                  onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
                  onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Severity */}
                  <span style={{
                    display: "inline-block", padding: "3px 8px", borderRadius: 4,
                    background: S[f.severity]?.bg || "transparent",
                    border: `1px solid ${S[f.severity]?.color || "var(--border)"}40`,
                    color: S[f.severity]?.color || "var(--accent3)",
                    ...font(9, 800), letterSpacing: "0.06em", textAlign: "center",
                  }}>{f.severity}</span>

                  {/* Rule + resource */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...mono(10), color: "var(--cyan)",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.rule_id}
                    </div>
                    <div style={{ ...font(11), color: "var(--accent2)", marginTop: 2,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.resource_name || f.resource_id || "—"}
                    </div>
                  </div>

                  {/* Service badge */}
                  <span style={{
                    padding: "2px 7px", borderRadius: 4,
                    background: "rgba(0,207,255,0.08)", border: "1px solid rgba(0,207,255,0.2)",
                    color: "var(--blue)", ...font(9, 700), textAlign: "center",
                  }}>{svc}</span>

                  {/* Account */}
                  <div style={{ ...mono(10), color: "var(--accent3)",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.account_name || "—"}
                  </div>

                  {/* Status */}
                  <span style={{
                    ...font(9, 700), letterSpacing: "0.06em",
                    color: st === "resolved" ? "#6b7280" : st === "acknowledged" ? "#4b5563" : "#1f2937",
                  }}>{st.toUpperCase()}</span>

                  {/* Arrow */}
                  <span style={{
                    color: "var(--accent3)", fontSize: 14,
                    transform: open ? "rotate(90deg)" : "none",
                    transition: "transform 0.15s", display: "inline-block",
                  }}>›</span>
                </div>

                {/* Expanded detail */}
                {open && (
                  <div style={{
                    padding: "16px 18px 18px", borderBottom: "1px solid var(--border)",
                    borderLeft: `3px solid ${S[f.severity]?.color || "var(--border)"}`,
                    background: "rgba(79,143,247,0.02)",
                    animation: "fadeIn 0.15s ease",
                  }}>
                    {/* Message */}
                    <div style={{
                      ...font(12), color: "var(--accent)", lineHeight: 1.6, marginBottom: 14,
                    }}>{f.message}</div>

                    {/* Remediation */}
                    {f.remediation && (
                      <div style={{
                        padding: "12px 14px", borderRadius: 8,
                        background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.12)",
                        marginBottom: 14,
                      }}>
                        <div style={{ ...font(9, 700), color: "#39ff14", letterSpacing: "0.12em",
                                      marginBottom: 6 }}>FIX</div>
                        <div style={{ ...mono(11), color: "var(--accent2)", lineHeight: 1.6 }}>
                          {f.remediation}
                        </div>
                      </div>
                    )}

                    {/* Frameworks */}
                    {f.frameworks?.length > 0 && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                        {f.frameworks.map(fw => (
                          <span key={fw} style={{
                            padding: "3px 8px", borderRadius: 4,
                            background: "rgba(191,95,255,0.08)", border: "1px solid rgba(191,95,255,0.2)",
                            color: "var(--purple)", ...mono(9), fontWeight: 700,
                          }}>{fw}</span>
                        ))}
                      </div>
                    )}

                    {/* Status controls */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {["open", "acknowledged", "resolved"].map(s => {
                        const active = st === s;
                        const c = s === "resolved" ? "#6b7280" : s === "acknowledged" ? "#4b5563" : "#1f2937";
                        return (
                          <button key={s}
                            onClick={e => { e.stopPropagation(); setFindingStatus(f, s); }}
                            style={{
                              padding: "5px 14px", borderRadius: 5, ...font(10, 700),
                              letterSpacing: "0.06em", cursor: "pointer",
                              background: active ? `${c}18` : "transparent",
                              border: `1px solid ${active ? c : "var(--border)"}`,
                              color: active ? c : "var(--accent3)",
                              transition: "all 0.15s",
                            }}>{s.toUpperCase()}</button>
                        );
                      })}
                      {f.resource_id && (
                        <span style={{ marginLeft: "auto", ...mono(9), color: "var(--accent3)" }}>
                          {f.resource_id}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length > 0 && (
          <div style={{ padding: "8px 18px", borderTop: "1px solid var(--border)",
                        ...mono(10), color: "var(--accent3)" }}>
            Click any row to see details, remediation &amp; update status
          </div>
        )}
      </div>
    </div>
  );
}
