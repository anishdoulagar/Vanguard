import { useState, useEffect, useCallback, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CATEGORIES = ["Production", "Development", "Staging", "Testing", "Sandbox", "General"];

const CATEGORY_COLORS = {
  Production: { color: "#e05555", bg: "rgba(224,85,85,0.1)",   border: "rgba(224,85,85,0.3)" },
  Staging:    { color: "#d97b3a", bg: "rgba(217,123,58,0.1)",  border: "rgba(217,123,58,0.3)" },
  Development:{ color: "#7b8cde", bg: "rgba(123,140,222,0.1)", border: "rgba(123,140,222,0.3)" },
  Testing:    { color: "#c9a84c", bg: "rgba(201,168,76,0.1)",  border: "rgba(201,168,76,0.3)" },
  Sandbox:    { color: "#4caf7d", bg: "rgba(76,175,125,0.1)",  border: "rgba(76,175,125,0.3)" },
  General:    { color: "#8899aa", bg: "rgba(136,153,170,0.1)", border: "rgba(136,153,170,0.3)" },
};

function getCategoryStyle(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;
}

function CategoryBadge({ category }) {
  const s = getCategoryStyle(category);
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700,
      fontFamily: "var(--font-ui)", letterSpacing: "0.1em", textTransform: "uppercase",
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>{category || "General"}</span>
  );
}

function TeamBadge({ teamName }) {
  if (!teamName) return (
    <span style={{ color: "var(--accent3)", fontSize: 10, fontFamily: "var(--font-ui)" }}>
      No team
    </span>
  );
  return (
    <span style={{
      padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700,
      fontFamily: "var(--font-ui)", letterSpacing: "0.06em",
      background: "rgba(0,113,227,0.08)", border: "1px solid rgba(0,113,227,0.25)",
      color: "var(--cyan)",
    }}>⬡ {teamName}</span>
  );
}

function CategoryPicker({ value, onChange }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={labelStyle}>CATEGORY</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        {CATEGORIES.map(c => {
          const s = getCategoryStyle(c);
          const sel = value === c;
          return (
            <button key={c} onClick={() => onChange(c)} style={{
              padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontSize: 10,
              fontFamily: "var(--font-ui)", fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", transition: "all 0.15s",
              border: `1px solid ${sel ? s.border : "var(--border)"}`,
              background: sel ? s.bg : "transparent",
              color: sel ? s.color : "var(--accent3)",
            }}>{c}</button>
          );
        })}
      </div>
    </div>
  );
}

function scoreColor(s) {
  if (s >= 80) return "#4caf7d";
  if (s >= 60) return "#c9a84c";
  if (s >= 40) return "#d97b3a";
  return "#e05555";
}
function scoreLabel(s) {
  if (s >= 80) return "LOW RISK";
  if (s >= 60) return "MED RISK";
  if (s >= 40) return "HIGH RISK";
  return "CRITICAL";
}

function relativeTime(isoStr) {
  if (!isoStr) return null;
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (diff < 10)    return "just now";
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const inputStyle = {
  width: "100%", background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: "6px", padding: "9px 12px", color: "var(--accent)",
  fontFamily: "var(--font-mono)", fontSize: "13px", boxSizing: "border-box",
};
const labelStyle = {
  display: "block", color: "var(--accent3)", fontSize: "11px",
  letterSpacing: "0.1em", marginBottom: "5px",
  fontFamily: "var(--font-ui)", fontWeight: 600,
};

function Field({ label, type = "text", placeholder, value, onChange }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} style={inputStyle} autoComplete="off" />
    </div>
  );
}

// ── 3-Dot Menu ───────────────────────────────────────────────────────────────
function ThreeDotMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: "transparent", border: "none", cursor: "pointer",
          color: "var(--accent3)", fontSize: "20px", lineHeight: 1,
          padding: "0 6px", borderRadius: "4px", transition: "color 0.15s" }}
        onMouseEnter={e => e.target.style.color = "var(--accent)"}
        onMouseLeave={e => e.target.style.color = "var(--accent3)"}
      >⋯</button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 10 }}
               onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "8px", overflow: "hidden", zIndex: 20,
            minWidth: "140px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            <button onClick={() => { setOpen(false); onEdit(); }} style={{
              display: "block", width: "100%", padding: "10px 16px",
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--accent2)", fontFamily: "var(--font-ui)",
              fontSize: "12px", fontWeight: 600, textAlign: "left",
              letterSpacing: "0.06em",
            }}
            onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.target.style.background = "transparent"}
            >✎ EDIT</button>
            <div style={{ height: "1px", background: "var(--border)" }} />
            <button onClick={() => { setOpen(false); onDelete(); }} style={{
              display: "block", width: "100%", padding: "10px 16px",
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--red)", fontFamily: "var(--font-ui)",
              fontSize: "12px", fontWeight: 600, textAlign: "left",
              letterSpacing: "0.06em",
            }}
            onMouseEnter={e => e.target.style.background = "rgba(224,85,85,0.08)"}
            onMouseLeave={e => e.target.style.background = "transparent"}
            >✕ DELETE</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Add Account Modal ─────────────────────────────────────────────────────────
function AddAccountModal({ token, userRole, onClose, onAdded }) {
  const [cloud,    setCloud]    = useState("aws");
  const [name,     setName]     = useState("");
  const [category, setCategory] = useState("General");
  const [interval,     setInterval]     = useState(24);
  const [intervalMode, setIntervalMode] = useState("preset");
  const [customHours,  setCustomHours]  = useState(1);
  const [customUnit,   setCustomUnit]   = useState("hours");
  const [keyId,    setKeyId]    = useState("");
  const [secret,   setSecret]   = useState("");
  const [region,   setRegion]   = useState("");
  const [subId,    setSubId]    = useState("");
  const [tenant,   setTenant]   = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSec,setClientSec]= useState("");
  const [testing, setTesting] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [testMsg, setTestMsg] = useState(null);
  const [error,   setError]   = useState(null);
  const [teams,   setTeams]   = useState([]);
  const [teamId,  setTeamId]  = useState("");

  // Load available teams once
  useEffect(() => {
    fetch(`${API}/teams`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        const t = d.teams || [];
        setTeams(t);
        if (t.length === 1) setTeamId(t[0].id);
      }).catch(() => {});
  }, [token]);

  function buildPayload() {
    const eff = intervalMode === "continuous" ? 0.25
      : intervalMode === "custom"
        ? (customUnit === "minutes" ? customHours / 60
         : customUnit === "days"    ? customHours * 24
         : customHours) : interval;
    const base = { name, cloud, category, scan_interval_hours: eff };
    if (teamId) base.team_id = teamId;
    if (cloud === "aws") return { ...base, access_key_id: keyId, secret_access_key: secret, region };
    return { ...base, subscription_id: subId, tenant_id: tenant, client_id: clientId, client_secret: clientSec };
  }

  async function handleTest() {
    setTesting(true); setTestMsg(null); setError(null);
    const creds = cloud === "aws"
      ? { cloud, aws: { access_key_id: keyId, secret_access_key: secret, region } }
      : { cloud, azure: { subscription_id: subId, tenant_id: tenant, client_id: clientId, client_secret: clientSec } };
    try {
      const res  = await fetch(`${API}/test-connection`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(creds),
      });
      const data = await res.json();
      if (res.ok) setTestMsg({ ok: true, msg: "Connection successful ✓" });
      else {
        const detail = data.detail;
        const msg = typeof detail === "object" && detail !== null
          ? Object.entries(detail).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(" | ")
          : String(detail || "Connection test failed.");
        setTestMsg({ ok: false, msg });
      }
    } catch { setTestMsg({ ok: false, msg: "Unable to connect. Please check your credentials." }); }
    finally { setTesting(false); }
  }

  async function handleSave() {
    if (!name.trim()) { setError("Account name is required."); return; }
    setSaving(true); setError(null);
    try {
      const res  = await fetch(`${API}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (res.ok) { onAdded(data.account); onClose(); }
      else setError(data.detail || "Failed to save. Please try again.");
    } catch { setError("Cannot reach API."); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:200,
      animation:"overlayIn 0.2s ease-out" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:"12px", padding:"32px", width:"500px", maxHeight:"90vh", overflowY:"auto",
        animation:"modalIn 0.25s cubic-bezier(0.23, 1, 0.32, 1)" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:"18px", fontWeight:700,
            color:"var(--accent)", letterSpacing:"0.05em", margin:0 }}>ADD CLOUD ACCOUNT</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none",
            color:"var(--accent3)", fontSize:"20px", cursor:"pointer" }}>×</button>
        </div>

        <Field label="ACCOUNT NAME *" placeholder='e.g. "Production AWS"' value={name} onChange={setName} />

        <CategoryPicker value={category} onChange={setCategory} />

        {/* Team selector */}
        {teams.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>TEAM {userRole !== "superadmin" ? "*" : "(OPTIONAL)"}</label>
            <select value={teamId} onChange={e => setTeamId(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              {userRole === "superadmin" && <option value="">— No team</option>}
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        {teams.length === 1 && (
          <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 6,
            background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.15)" }}>
            <span style={{ fontSize: 11, color: "var(--accent3)" }}>Team: </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--cyan)" }}>{teams[0].name}</span>
          </div>
        )}
        {teams.length === 0 && userRole !== "superadmin" && (
          <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 6,
            background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.2)",
            fontSize: 12, color: "var(--red)" }}>
            ⚠ You must belong to a team before adding accounts.
          </div>
        )}

        <div style={{ marginBottom:"20px" }}>
          <label style={labelStyle}>CLOUD PROVIDER</label>
          <div style={{ display:"flex", background:"var(--card)", border:"1px solid var(--border)",
            borderRadius:"6px", overflow:"hidden" }}>
            {["aws","azure"].map(c => (
              <button key={c} onClick={() => { setCloud(c); setTestMsg(null); }} style={{
                flex:1, padding:"9px", border:"none", cursor:"pointer",
                background: cloud===c ? "rgba(79,143,247,0.08)" : "transparent",
                color:      cloud===c ? "var(--cyan)"         : "var(--accent3)",
                fontFamily:"var(--font-ui)", fontWeight:700, fontSize:"12px",
                letterSpacing:"0.1em", textTransform:"uppercase",
                borderBottom: cloud===c ? "2px solid var(--cyan)" : "2px solid transparent",
                textShadow: "none",
              }}>{c}</button>
            ))}
          </div>
        </div>

        {cloud === "aws" && <>
          <Field label="ACCESS KEY ID *"     placeholder="AKIA..." value={keyId}   onChange={setKeyId} />
          <Field label="SECRET ACCESS KEY *" type="password"
            placeholder="••••••••••••••••••••••••••••••••••••••" value={secret} onChange={setSecret} />
          <Field label="REGION" placeholder="e.g. us-east-1 (optional)" value={region} onChange={setRegion} />
        </>}
        {cloud === "azure" && <>
          <Field label="SUBSCRIPTION ID *" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={subId}     onChange={setSubId} />
          <Field label="TENANT ID *"       placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={tenant}    onChange={setTenant} />
          <Field label="CLIENT ID *"       placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={clientId}  onChange={setClientId} />
          <Field label="CLIENT SECRET *"   type="password"
            placeholder="••••••••••••••••••••••••••••••••" value={clientSec} onChange={setClientSec} />
        </>}

        <div style={{ marginBottom:"20px" }}>
          <label style={labelStyle}>AUTO-SCAN INTERVAL</label>
          <div style={{ display:"flex", background:"var(--bg)", border:"1px solid var(--border)",
            borderRadius:"6px", overflow:"hidden", marginBottom:"10px" }}>
            {[{id:"preset",label:"PRESET"},{id:"custom",label:"CUSTOM"},{id:"continuous",label:"CONTINUOUS"}].map(m => (
              <button key={m.id} onClick={() => setIntervalMode(m.id)} style={{
                flex:1, padding:"7px 0", border:"none", cursor:"pointer",
                background: intervalMode===m.id ? "rgba(79,143,247,0.08)" : "transparent",
                color:      intervalMode===m.id ? "var(--cyan)"         : "var(--accent3)",
                fontFamily:"var(--font-ui)", fontWeight:700, fontSize:"11px",
                letterSpacing:"0.08em", transition:"all 0.15s",
                borderBottom: intervalMode===m.id ? "2px solid var(--cyan)" : "2px solid transparent",
              }}>{m.label}</button>
            ))}
          </div>
          {intervalMode === "preset" && (
            <select value={interval} onChange={e => setInterval(Number(e.target.value))}
              style={{ ...inputStyle, cursor:"pointer" }}>
              <option value={0}>Manual only</option>
              <option value={1}>Every hour</option>
              <option value={3}>Every 3 hours</option>
              <option value={6}>Every 6 hours</option>
              <option value={12}>Every 12 hours</option>
              <option value={24}>Every 24 hours</option>
              <option value={48}>Every 48 hours</option>
              <option value={72}>Every 3 days</option>
              <option value={168}>Weekly</option>
            </select>
          )}
          {intervalMode === "custom" && (
            <div style={{ display:"flex", gap:"8px" }}>
              <input type="number" min="1" max="999" value={customHours}
                onChange={e => setCustomHours(Math.max(1, Number(e.target.value)))}
                style={{ ...inputStyle, width:"80px" }} />
              <select value={customUnit} onChange={e => setCustomUnit(e.target.value)}
                style={{ ...inputStyle, flex:1, cursor:"pointer" }}>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          )}
          {intervalMode === "continuous" && (
            <div style={{ padding:"12px 14px", borderRadius:"6px",
              background:"rgba(76,175,125,0.08)", border:"1px solid rgba(76,175,125,0.25)" }}>
              <div style={{ color:"var(--green)", fontSize:"12px", fontFamily:"var(--font-ui)",
                fontWeight:700, marginBottom:"4px" }}>● CONTINUOUS MONITORING</div>
              <div style={{ color:"var(--accent3)", fontSize:"11px",
                fontFamily:"var(--font-mono)", lineHeight:1.5 }}>
                Scans every 15 minutes around the clock.
              </div>
            </div>
          )}
        </div>

        {testMsg && (
          <div style={{ padding:"9px 12px", borderRadius:"6px", marginBottom:"14px",
            background: testMsg.ok ? "rgba(76,175,125,0.1)" : "rgba(224,85,85,0.1)",
            color:      testMsg.ok ? "var(--green)"         : "var(--red)",
            border: `1px solid ${testMsg.ok ? "rgba(76,175,125,0.3)" : "rgba(224,85,85,0.3)"}`,
            fontSize:"12px", fontFamily:"var(--font-mono)" }}>{testMsg.msg}</div>
        )}
        {error && (
          <div style={{ padding:"9px 12px", borderRadius:"6px", marginBottom:"14px",
            background:"rgba(224,85,85,0.1)", color:"var(--red)",
            border:"1px solid rgba(224,85,85,0.3)",
            fontSize:"12px", fontFamily:"var(--font-mono)" }}>{error}</div>
        )}
        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={handleTest} disabled={testing} style={{
            flex:1, padding:"10px", border:"1px solid var(--border)", borderRadius:"6px",
            background:"transparent", color:"var(--accent2)", fontFamily:"var(--font-ui)",
            fontWeight:600, fontSize:"13px", cursor: testing ? "not-allowed" : "pointer",
          }}>{testing ? "TESTING..." : "TEST"}</button>
          <button onClick={handleSave} disabled={saving} className="neon-btn" style={{
            flex:2, padding:"10px",
            border:`1px solid ${saving ? "var(--border)" : "var(--cyan)"}`,
            borderRadius:"6px", background:"transparent",
            color: saving ? "var(--accent3)" : "var(--cyan)",
            fontFamily:"var(--font-ui)", fontWeight:700, fontSize:"13px",
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: saving ? "none" : "var(--glow-cyan)",
                      }}>{saving ? "SAVING..." : "SAVE ACCOUNT"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Account Modal ────────────────────────────────────────────────────────
function EditAccountModal({ account, token, onClose, onUpdated }) {
  const [name,     setName]     = useState(account.name);
  const [category, setCategory] = useState(account.category || "General");
  const [interval, setInterval] = useState(account.scan_interval_hours ?? 24);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  async function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API}/accounts/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ name, category, scan_interval_hours: interval }),
      });
      const data = await res.json();
      if (res.ok) { onUpdated(data.account); onClose(); }
      else setError(data.detail || "Update failed.");
    } catch { setError("Cannot reach API."); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:300,
      animation:"overlayIn 0.2s ease-out" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:"12px", padding:"28px", width:"420px",
        animation:"modalIn 0.25s cubic-bezier(0.23, 1, 0.32, 1)" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:"20px" }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:"16px", fontWeight:700,
            color:"var(--accent)", letterSpacing:"0.05em", margin:0 }}>EDIT ACCOUNT</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none",
            color:"var(--accent3)", fontSize:"20px", cursor:"pointer" }}>×</button>
        </div>

        <div style={{ marginBottom:"16px", display:"flex", alignItems:"center", gap:"8px" }}>
          <span style={{ background: account.cloud==="aws" ? "#ff9900" : "#0089d6",
            color:"#000", fontSize:"9px", fontWeight:700, padding:"2px 6px",
            borderRadius:"3px", fontFamily:"var(--font-ui)" }}>
            {account.cloud.toUpperCase()}
          </span>
          <span style={{ color:"var(--accent3)", fontSize:"12px", fontFamily:"var(--font-mono)" }}>
            {account.region || "—"} · credentials cannot be changed
          </span>
        </div>

        <Field label="ACCOUNT NAME" placeholder="Production AWS" value={name} onChange={setName} />

        <CategoryPicker value={category} onChange={setCategory} />

        <div style={{ marginBottom:"20px" }}>
          <label style={labelStyle}>AUTO-SCAN INTERVAL</label>
          <select value={interval} onChange={e => setInterval(Number(e.target.value))}
            style={{ ...inputStyle, cursor:"pointer" }}>
            <option value={0}>Manual only</option>
            <option value={0.25}>Continuous (every 15 min)</option>
            <option value={1}>Every hour</option>
            <option value={3}>Every 3 hours</option>
            <option value={6}>Every 6 hours</option>
            <option value={12}>Every 12 hours</option>
            <option value={24}>Every 24 hours</option>
            <option value={48}>Every 48 hours</option>
            <option value={72}>Every 3 days</option>
            <option value={168}>Weekly</option>
          </select>
        </div>

        {error && <div style={{ padding:"8px 12px", borderRadius:"6px", marginBottom:"14px",
          background:"rgba(224,85,85,0.1)", color:"var(--red)",
          border:"1px solid rgba(224,85,85,0.3)", fontSize:"12px",
          fontFamily:"var(--font-mono)" }}>{error}</div>}

        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px",
            border:"1px solid var(--border)", borderRadius:"6px",
            background:"transparent", color:"var(--accent2)",
            fontFamily:"var(--font-ui)", fontSize:"13px", cursor:"pointer" }}>CANCEL</button>
          <button onClick={handleSave} disabled={saving} className="neon-btn" style={{ flex:2, padding:"10px",
            border:`1px solid ${saving ? "var(--border)" : "var(--cyan)"}`,
            borderRadius:"6px", background:"transparent",
            color: saving ? "var(--accent3)" : "var(--cyan)",
            fontFamily:"var(--font-ui)", fontWeight:700,
            fontSize:"13px", cursor: saving ? "not-allowed" : "pointer",
            boxShadow: saving ? "none" : "var(--glow-cyan)",
          }}>
            {saving ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Account Card ──────────────────────────────────────────────────────────────
function AccountCard({ account, token, role, scanningBy, onDelete, onScanComplete, onUpdate }) {
  const canScan = role !== "viewer";
  const canEdit = role === "admin" || role === "superadmin";

  // Separate local scan state from external scan indicator
  const [scanning,     setScanning]     = useState(false);
  const [lastScore,    setLastScore]     = useState(null);
  const [lastScannedAt, setLastScannedAt] = useState(account.last_scanned_at || null);
  const [, setTick] = useState(0); // forces re-render for live relative time
  const [showEdit,     setShowEdit]     = useState(false);
  const [scanErr,      setScanErr]      = useState(null);
  const [deleteErr,    setDeleteErr]    = useState(null);

  // Re-render every 30s so relative timestamps stay current
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Sync lastScannedAt from prop when parent refreshes account data
  useEffect(() => {
    if (account.last_scanned_at) setLastScannedAt(account.last_scanned_at);
  }, [account.last_scanned_at]);

  const isExternallyScanning = !!scanningBy && !scanning;

  async function handleScan() {
    setScanning(true); setScanErr(null);
    try {
      const res  = await fetch(`${API}/accounts/${account.id}/scan`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLastScore(data.scores?.overall ?? data.scores?.aws ?? data.scores?.azure);
        if (data.last_scanned_at) setLastScannedAt(data.last_scanned_at);
        onScanComplete(data);
      } else {
        setScanErr(data.detail || "Scan failed. Please verify your credentials.");
      }
    } catch {
      setScanErr("Cannot reach the backend server. Please check your connection.");
    } finally { setScanning(false); }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${account.name}"? This removes all scan history.`)) return;
    setDeleteErr(null);
    try {
      const res = await fetch(`${API}/accounts/${account.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onDelete(account.id);
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteErr(data.detail || "Failed to delete account.");
      }
    } catch { setDeleteErr("Cannot reach the backend server."); }
  }

  const relTs = relativeTime(lastScannedAt);
  const clockTs = lastScannedAt
    ? new Date(lastScannedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;
  const isActivelyScanning = scanning || isExternallyScanning;

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "10px", padding: "20px",
      borderLeft: `3px solid ${account.cloud === "aws" ? "#ff9900" : "#0089d6"}`,
      transition: "border-color 0.2s",
      ...(isActivelyScanning && { borderColor: "rgba(0,113,227,0.5)" }),
    }}>
      {showEdit && (
        <EditAccountModal account={account} token={token}
          onClose={() => setShowEdit(false)}
          onUpdated={u => { onUpdate(u); setShowEdit(false); }} />
      )}

      {/* Header row */}
      <div style={{ display:"flex", alignItems:"flex-start",
                    justifyContent:"space-between", marginBottom:"14px" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
            <span style={{ background: account.cloud==="aws" ? "#ff9900" : "#0089d6",
              color:"#000", fontSize:"9px", fontWeight:700, padding:"2px 6px",
              borderRadius:"3px", fontFamily:"var(--font-ui)", letterSpacing:"0.08em" }}>
              {account.cloud.toUpperCase()}
            </span>
            <CategoryBadge category={account.category || "General"} />
            <TeamBadge teamName={account.team_name} />
            <span style={{ color:"var(--accent)", fontSize:"15px",
              fontWeight:700, fontFamily:"var(--font-display)" }}>{account.name}</span>
          </div>
          {account.region && (
            <div style={{ color:"var(--accent3)", fontSize:"11px",
              fontFamily:"var(--font-mono)", marginTop:"4px" }}>{account.region}</div>
          )}
        </div>

        {/* Score + 3-dot menu */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {lastScore != null && !isActivelyScanning && (
            <div style={{ textAlign:"center" }}>
              <div style={{ color:scoreColor(lastScore), fontSize:"24px", fontWeight:800,
                fontFamily:"var(--font-display)", lineHeight:1 }}>{lastScore}</div>
              <div style={{ color:scoreColor(lastScore), fontSize:"9px",
                fontFamily:"var(--font-ui)", letterSpacing:"0.08em" }}>{scoreLabel(lastScore)}</div>
            </div>
          )}
          {canEdit && <ThreeDotMenu onEdit={() => setShowEdit(true)} onDelete={handleDelete} />}
        </div>
      </div>

      {/* Meta row: interval + last scanned */}
      <div style={{ display:"flex", gap:"16px", marginBottom:"14px", flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ color:"var(--accent3)", fontSize:"11px", fontFamily:"var(--font-mono)" }}>
          {account.scan_interval_hours === 0 ? "Manual scans only"
          : account.scan_interval_hours <= 0.3 ? "● Continuous (every 15 min)"
          : account.scan_interval_hours < 1
            ? `Every ${Math.round(account.scan_interval_hours * 60)} min`
          : account.scan_interval_hours < 24
            ? `Every ${account.scan_interval_hours}h`
          : account.scan_interval_hours === 168 ? "Weekly"
          : `Every ${account.scan_interval_hours / 24}d`}
        </div>

        {/* Last scanned indicator */}
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <div style={{
            width:6, height:6, borderRadius:"50%", flexShrink:0,
            background: relTs ? "var(--green)" : "var(--accent3)",
            ...(isActivelyScanning && {
              animation: "pulse 1.2s ease-in-out infinite",
              background: "var(--cyan)",
            }),
          }} />
          <span style={{
            fontSize:"11px", fontFamily:"var(--font-mono)",
            color: isActivelyScanning ? "var(--cyan)" : relTs ? "var(--accent2)" : "var(--accent3)",
            fontStyle: relTs ? "normal" : "italic",
          }}>
            {isActivelyScanning
              ? (isExternallyScanning
                  ? `Scanning (${scanningBy})…`
                  : "Scanning…")
              : relTs
                ? <>{`Scanned ${relTs}`}<span style={{ color:"var(--accent3)", marginLeft:5 }}>· {clockTs}</span></>
                : "Never scanned"}
          </span>
        </div>
      </div>

      {/* Error messages */}
      {scanErr && (
        <div style={{ marginBottom:"10px", padding:"8px 12px", borderRadius:"6px",
          background:"rgba(224,85,85,0.1)", color:"var(--red)",
          border:"1px solid rgba(224,85,85,0.3)", fontSize:"12px",
          fontFamily:"var(--font-mono)", display:"flex", alignItems:"center", gap:"8px" }}>
          <span>⚠</span>
          <span style={{ flex:1 }}>{scanErr}</span>
          <button onClick={() => setScanErr(null)} style={{ background:"transparent",
            border:"none", color:"var(--red)", cursor:"pointer", fontSize:"13px" }}>✕</button>
        </div>
      )}
      {deleteErr && (
        <div style={{ marginBottom:"10px", padding:"8px 12px", borderRadius:"6px",
          background:"rgba(224,85,85,0.1)", color:"var(--red)",
          border:"1px solid rgba(224,85,85,0.3)", fontSize:"12px",
          fontFamily:"var(--font-mono)" }}>
          ⚠ {deleteErr}
        </div>
      )}

      {/* Scan button */}
      {canScan ? (
        <button onClick={handleScan}
          disabled={scanning || isExternallyScanning}
          className="neon-btn" style={{
            width:"100%", padding:"8px",
            border:`1px solid ${isActivelyScanning ? "var(--border)" : "var(--cyan)"}`,
            borderRadius:"6px", background:"transparent",
            color: isActivelyScanning ? "var(--accent3)" : "var(--cyan)",
            fontFamily:"var(--font-ui)", fontWeight:700, fontSize:"12px",
            letterSpacing:"0.08em",
            cursor: isActivelyScanning ? "not-allowed" : "pointer",
            boxShadow: isActivelyScanning ? "none" : "var(--glow-cyan)",
            transition:"all 0.15s",
          }}>
          {scanning ? "SCANNING…"
            : isExternallyScanning ? `SCANNING (${scanningBy.toUpperCase()})…`
            : "SCAN NOW"}
        </button>
      ) : (
        <div style={{ width:"100%", padding:"8px", textAlign:"center",
          border:"1px solid var(--border)", borderRadius:"6px",
          color:"var(--accent3)", fontFamily:"var(--font-ui)",
          fontSize:"11px", letterSpacing:"0.1em" }}>
          VIEW ONLY
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AccountsPage({ token, role, user, onScanComplete }) {
  const canScan = role !== "viewer";
  const [accounts,    setAccounts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [pageError,   setPageError]   = useState(null);
  const [showModal,   setShowModal]   = useState(false);
  const [scanningMap, setScanningMap] = useState({});
  const prevScanningRef = useRef({});

  const fetchAccounts = useCallback(async () => {
    setPageError(null);
    try {
      const res = await fetch(`${API}/accounts`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      } else {
        const data = await res.json().catch(() => ({}));
        setPageError(data.detail || "Failed to load accounts.");
      }
    } catch {
      setPageError("Cannot reach the backend server. Please check your connection.");
    } finally { setLoading(false); }
  }, [token]);

  // Refresh a single account's data after it finishes scanning
  const refreshAccount = useCallback(async (accountId) => {
    try {
      const res = await fetch(`${API}/accounts`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const updated = (data.accounts || []).find(a => String(a.id) === String(accountId));
        if (updated) {
          setAccounts(prev => prev.map(a => String(a.id) === String(accountId) ? updated : a));
        }
      }
    } catch { /* silent */ }
  }, [token]);

  // Poll scanning status every 10s; refresh accounts that just finished scanning
  useEffect(() => {
    let cancelled = false;

    async function pollScanning() {
      try {
        const res = await fetch(`${API}/accounts/scanning`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const current = data.scanning || {};

        // Find accounts that just stopped scanning
        const prev = prevScanningRef.current;
        const justFinished = Object.keys(prev).filter(id => !(id in current));
        justFinished.forEach(id => refreshAccount(id));

        prevScanningRef.current = current;
        if (!cancelled) setScanningMap(current);
      } catch { /* silent — backend may be temporarily unreachable */ }
    }

    pollScanning();
    const scanInterval = setInterval(pollScanning, 10_000);
    // Full accounts refresh every 60s to pick up scheduled scan results
    const fullRefreshInterval = setInterval(() => { if (!cancelled) fetchAccounts(); }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(scanInterval);
      clearInterval(fullRefreshInterval);
    };
  }, [token, fetchAccounts, refreshAccount]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  return (
    <div style={{ padding:"32px", maxWidth:"1100px", margin:"0 auto",
                  animation:"fadeIn 0.3s ease" }}>

      {showModal && (
        <AddAccountModal token={token} userRole={user?.role}
          onClose={() => setShowModal(false)}
          onAdded={a => setAccounts(prev => [...prev, a])} />
      )}

      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", marginBottom:"28px" }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:"22px", fontWeight:700,
            color:"var(--accent)", letterSpacing:"0.05em", margin:0 }}>CLOUD ACCOUNTS</h1>
          <p style={{ color:"var(--accent3)", fontSize:"13px",
            marginTop:"4px", fontFamily:"var(--font-mono)" }}>
            {accounts.length} account{accounts.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        {canScan && (
          <button onClick={() => setShowModal(true)} className="neon-btn" style={{
            padding:"9px 20px", background:"transparent", color:"var(--cyan)",
            border:"1px solid var(--cyan)", borderRadius:"6px", fontFamily:"var(--font-ui)",
            fontWeight:700, fontSize:"13px", cursor:"pointer", letterSpacing:"0.08em",
            boxShadow:"var(--glow-cyan)",
          }}>+ ADD ACCOUNT</button>
        )}
      </div>

      {pageError && (
        <div style={{ marginBottom:"20px", padding:"12px 16px",
          background:"rgba(224,85,85,0.08)", border:"1px solid rgba(224,85,85,0.25)",
          borderRadius:"8px", color:"#e05555",
          fontFamily:"var(--font-mono)", fontSize:"12px",
          display:"flex", alignItems:"center", gap:"10px" }}>
          <span>⚠</span> {pageError}
        </div>
      )}

      {loading && (
        <div style={{ textAlign:"center", padding:"60px",
                      color:"var(--accent3)", fontFamily:"var(--font-mono)" }}>
          <div style={{ width:"28px", height:"28px", border:"2px solid var(--border)",
            borderTop:"2px solid var(--cyan)", borderRadius:"50%",
            animation:"spin 0.8s linear infinite", margin:"0 auto 12px" }} />
          LOADING...
        </div>
      )}

      {!loading && accounts.length === 0 && (
        <div style={{ textAlign:"center", padding:"80px 20px",
          border:"1px dashed var(--border)", borderRadius:"12px" }}>
          <div style={{ fontSize:"40px", marginBottom:"16px" }}>☁</div>
          <div style={{ color:"var(--accent)", fontSize:"16px",
            fontFamily:"var(--font-display)", fontWeight:700, marginBottom:"8px" }}>
            NO ACCOUNTS YET
          </div>
          <div style={{ color:"var(--accent3)", fontSize:"13px",
            fontFamily:"var(--font-ui)", marginBottom:"24px" }}>
            Add your AWS or Azure accounts to start monitoring
          </div>
          {canScan && (
            <button onClick={() => setShowModal(true)} className="neon-btn" style={{
              padding:"10px 24px", background:"transparent", color:"var(--cyan)",
              border:"1px solid var(--cyan)", borderRadius:"6px", fontFamily:"var(--font-ui)",
              fontWeight:700, fontSize:"13px", cursor:"pointer", letterSpacing:"0.08em",
              boxShadow:"var(--glow-cyan)" }}>
              + ADD YOUR FIRST ACCOUNT
            </button>
          )}
        </div>
      )}

      {!loading && accounts.length > 0 && (() => {
        // Group by category, preserve CATEGORIES order, unknown categories at end
        const grouped = {};
        accounts.forEach(a => {
          const cat = a.category || "General";
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(a);
        });
        const orderedCats = [
          ...CATEGORIES.filter(c => grouped[c]),
          ...Object.keys(grouped).filter(c => !CATEGORIES.includes(c)),
        ];
        return orderedCats.map(cat => {
          const s = getCategoryStyle(cat);
          return (
            <div key={cat} style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                <span style={{
                  fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700,
                  color: s.color, letterSpacing: "0.12em", textTransform: "uppercase",
                }}>{cat}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent3)",
                }}>{grouped[cat].length} account{grouped[cat].length !== 1 ? "s" : ""}</span>
                <div style={{ flex: 1, height: 1, background: s.border }} />
              </div>
              <div style={{ display:"grid",
                gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))", gap:"16px" }}>
                {grouped[cat].map(account => (
                  <AccountCard key={account.id} account={account} token={token} role={role}
                    scanningBy={scanningMap[String(account.id)] || null}
                    onDelete={id => setAccounts(prev => prev.filter(a => a.id !== id))}
                    onUpdate={u  => setAccounts(prev => prev.map(a => a.id===u.id ? {...a,...u} : a))}
                    onScanComplete={onScanComplete} />
                ))}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}
