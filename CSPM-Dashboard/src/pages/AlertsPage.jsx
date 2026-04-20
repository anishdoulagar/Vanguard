import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const inputStyle = {
  width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: "6px", padding: "9px 12px", color: "rgba(0,0,0,0.9)",
  fontFamily: "var(--font-ui)", fontSize: "13px", boxSizing: "border-box",
  letterSpacing: "-0.006em", outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

const labelStyle = {
  display: "block", color: "#a39e98", fontSize: "10px",
  letterSpacing: "0.04em", marginBottom: "6px", textTransform: "uppercase",
  fontFamily: "var(--font-ui)", fontWeight: 600,
};

function Toggle({ value, onChange, label, sub }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "11px 14px", background: "#fff",
      border: "1px solid rgba(0,0,0,0.09)", borderRadius: "8px",
      cursor: "pointer", marginBottom: "8px",
      transition: "background 0.12s ease",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "#f6f5f4"}
      onMouseLeave={e => e.currentTarget.style.background = "#fff"}
    >
      <div>
        <div style={{ color: "rgba(0,0,0,0.9)", fontSize: "13px", letterSpacing: "-0.006em",
                      fontFamily: "var(--font-ui)", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ color: "#a39e98", fontSize: "11px",
                              fontFamily: "var(--font-ui)", marginTop: "2px",
                              letterSpacing: "-0.006em" }}>{sub}</div>}
      </div>
      <div style={{
        width: "38px", height: "22px", borderRadius: "11px",
        background: value ? "#4b7bc9" : "rgba(0,0,0,0.12)",
        position: "relative", flexShrink: 0,
        transition: "background 0.2s ease",
      }}>
        <div style={{
          position: "absolute", top: "3px",
          left: value ? "19px" : "3px",
          width: "16px", height: "16px", borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          transition: "left 0.18s cubic-bezier(0.23,1,0.32,1)",
        }} />
      </div>
    </div>
  );
}

function AccountAlertCard({ account, token, emailConfigured, userEmail, readOnly, canAdvanced }) {
  const [settings,       setSettings]       = useState(null);
  const [email,          setEmail]          = useState(userEmail || "");
  const [threshold,      setThreshold]      = useState(70);
  const [onCrit,         setOnCrit]         = useState(true);
  const [onHigh,         setOnHigh]         = useState(false);
  const [onMedium,       setOnMedium]       = useState(false);
  const [onNewFinding,   setOnNewFinding]   = useState(false);
  const [enabled,        setEnabled]        = useState(true);
  const [slackWebhook,   setSlackWebhook]   = useState("");
  const [slackEnabled,   setSlackEnabled]   = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [testing,        setTesting]        = useState(false);
  const [testingSlack,   setTestingSlack]   = useState(false);
  const [msg,            setMsg]            = useState(null);
  const [open,           setOpen]           = useState(false);

  useEffect(() => {
    fetch(`${API}/alerts/settings/${account.id}`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
    .then(r => r.json())
    .then(d => {
      if (d.settings) {
        const s = d.settings;
        setSettings(s); setEmail(s.email); setThreshold(s.score_threshold);
        setOnCrit(s.alert_on_critical); setOnHigh(s.alert_on_high);
        setOnMedium(s.alert_on_medium ?? false);
        setOnNewFinding(s.alert_on_new_finding ?? false);
        setEnabled(s.enabled);
        setSlackWebhook(s.slack_webhook_url || "");
        setSlackEnabled(s.slack_enabled ?? false);
      }
    })
    .catch(() => {});
  }, [account.id, token]);

  async function handleSave() {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/alerts/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          account_id: account.id, email, score_threshold: threshold,
          alert_on_critical: onCrit, alert_on_high: onHigh,
          alert_on_medium: onMedium, alert_on_new_finding: onNewFinding, enabled,
          slack_webhook_url: slackWebhook.trim() || null,
          slack_enabled: slackEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok) { setSettings(data.settings); setMsg({ ok: true, text: "Settings saved" }); }
      else setMsg({ ok: false, text: data.detail || "Save failed." });
    } catch { setMsg({ ok: false, text: "Unable to connect. Please try again." }); }
    finally { setSaving(false); }
  }

  async function handleTest() {
    setTesting(true); setMsg(null);
    try {
      const res = await fetch(`${API}/alerts/test/${account.id}`, {
        method: "POST", headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setMsg({ ok: true, text: `Test email sent to ${data.to}` });
      else setMsg({ ok: false, text: data.detail || "Test failed." });
    } catch { setMsg({ ok: false, text: "Unable to connect. Please try again." }); }
    finally { setTesting(false); }
  }

  async function handleTestSlack() {
    setTestingSlack(true); setMsg(null);
    try {
      const res = await fetch(`${API}/alerts/test-slack/${account.id}`, {
        method: "POST", headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setMsg({ ok: true, text: "Test Slack message sent — check your channel!" });
      else setMsg({ ok: false, text: data.detail || "Slack test failed." });
    } catch { setMsg({ ok: false, text: "Unable to connect. Please try again." }); }
    finally { setTestingSlack(false); }
  }

  const hasSettings = !!settings;
  const cloudColor = account.cloud === "aws" ? "#b87a2a" : "#3a7ab0";
  const cloudBg    = account.cloud === "aws" ? "rgba(184,122,42,0.09)" : "rgba(58,122,176,0.09)";

  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(0,0,0,0.09)",
      borderRadius: "10px", overflow: "hidden",
      boxShadow: "rgba(0,0,0,0.03) 0px 2px 8px, rgba(0,0,0,0.02) 0px 1px 3px",
    }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 18px", cursor: "pointer",
        transition: "background 0.12s ease",
      }}
        onMouseEnter={e => e.currentTarget.style.background = "#f6f5f4"}
        onMouseLeave={e => e.currentTarget.style.background = "#fff"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            background: cloudBg, color: cloudColor, fontSize: "10px", fontWeight: 700,
            padding: "3px 7px", borderRadius: "9999px", fontFamily: "var(--font-ui)",
            border: `1px solid ${cloudColor}30`,
          }}>{account.cloud.toUpperCase()}</span>
          <span style={{ color: "rgba(0,0,0,0.9)", fontSize: "14px",
                         fontWeight: 600, fontFamily: "var(--font-ui)", letterSpacing: "-0.006em" }}>
            {account.name}
          </span>
          {hasSettings && enabled && (
            <span style={{ fontSize: "11px", color: "#3a8a60", fontFamily: "var(--font-ui)",
                           fontWeight: 500, display:"flex", alignItems:"center", gap:4 }}>
              <span style={{fontSize:8}}>●</span> Active
            </span>
          )}
          {hasSettings && !enabled && (
            <span style={{ fontSize: "11px", color: "#a39e98", fontFamily: "var(--font-ui)" }}>Disabled</span>
          )}
          {!hasSettings && (
            <span style={{ fontSize: "11px", color: "#a39e98", fontFamily: "var(--font-ui)" }}>Not configured</span>
          )}
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a39e98" strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {open && readOnly && (
        <div style={{ padding: "12px 18px 16px", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          {!settings ? (
            <div style={{ color: "#a39e98", fontSize: "13px", fontFamily: "var(--font-ui)" }}>
              No alert settings configured for this account.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr",
                          gap: "8px 12px", fontFamily: "var(--font-ui)", fontSize: "13px" }}>
              {[
                ["Alert email", email || "—"],
                ["Score threshold", `≤ ${threshold}`],
                ["Critical findings", onCrit ? "Enabled" : "Disabled"],
                ["High findings",     onHigh ? "Enabled" : "Disabled"],
              ].map(([k, v]) => (
                <>
                  <span key={`k-${k}`} style={{ color: "#a39e98" }}>{k}</span>
                  <span key={`v-${k}`} style={{ color: "#615d59" }}>{v}</span>
                </>
              ))}
            </div>
          )}
        </div>
      )}

      {open && !readOnly && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ paddingTop: "16px" }}>

            {!emailConfigured && (
              <div style={{
                padding: "10px 12px", borderRadius: "6px", marginBottom: "14px",
                background: "rgba(154,125,24,0.06)", color: "#9a7d18",
                border: "1px solid rgba(154,125,24,0.2)",
                fontSize: "12px", fontFamily: "var(--font-ui)", letterSpacing: "-0.006em",
              }}>
                Email alerts not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASSWORD to your .env file.
              </div>
            )}

            <Toggle value={enabled} onChange={setEnabled}
              label="Enable alerts for this account"
              sub="Sends email when alert conditions are met" />

            <div style={{ marginBottom: "12px", marginTop: "14px" }}>
              <label style={labelStyle}>Alert email address</label>
              <input type="email" placeholder="alerts@yourcompany.com"
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor="#4b7bc9"; e.target.style.boxShadow="0 0 0 3px rgba(75,123,201,0.14)"; }}
                onBlur={e  => { e.target.style.borderColor="rgba(0,0,0,0.12)"; e.target.style.boxShadow="none"; }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Score threshold</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input type="range" min="0" max="100" value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#4b7bc9" }} />
                <span style={{
                  fontFamily: "var(--font-display)", fontSize: "18px",
                  fontWeight: 700, color: "rgba(0,0,0,0.7)",
                  minWidth: "36px", textAlign: "right", letterSpacing: "-0.02em",
                }}>{threshold}</span>
              </div>
              <div style={{ color: "#a39e98", fontSize: "11px", fontFamily: "var(--font-ui)", marginTop: "4px", letterSpacing: "-0.006em" }}>
                Alert when score drops to or below {threshold}
              </div>
            </div>

            <Toggle value={onCrit} onChange={setOnCrit}
              label="Alert on critical findings"
              sub="Triggers when any critical finding is detected" />
            <Toggle value={onHigh} onChange={setOnHigh}
              label="Alert on high findings"
              sub="Triggers when any high severity finding is detected" />

            {canAdvanced && (
              <Toggle value={onMedium} onChange={setOnMedium}
                label="Alert on medium findings"
                sub="Triggers when any medium severity finding is detected" />
            )}
            {canAdvanced && (
              <Toggle value={onNewFinding} onChange={setOnNewFinding}
                label="Alert on any new finding"
                sub="Triggers whenever a new finding appears, regardless of severity" />
            )}

            {/* Slack section */}
            <div style={{
              marginTop: "16px", padding: "14px 16px", borderRadius: "8px",
              background: "#f6f5f4", border: "1px solid rgba(0,0,0,0.08)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" fill="#4A154B"/>
                  <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="#4A154B"/>
                  <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z" fill="#4A154B"/>
                  <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z" fill="#4A154B"/>
                  <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z" fill="#4A154B"/>
                  <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" fill="#4A154B"/>
                  <path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z" fill="#4A154B"/>
                  <path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z" fill="#4A154B"/>
                </svg>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: "12px", fontWeight: 600,
                               color: "rgba(0,0,0,0.7)", letterSpacing: "-0.006em" }}>
                  Slack notifications
                </span>
              </div>
              <Toggle value={slackEnabled} onChange={setSlackEnabled}
                label="Enable Slack alerts"
                sub="Sends a message to your Slack channel when conditions trigger" />
              <div style={{ marginTop: "10px" }}>
                <label style={labelStyle}>Incoming webhook URL</label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/T.../B.../..."
                  value={slackWebhook}
                  onChange={e => setSlackWebhook(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor="#4b7bc9"; e.target.style.boxShadow="0 0 0 3px rgba(75,123,201,0.14)"; }}
                  onBlur={e  => { e.target.style.borderColor="rgba(0,0,0,0.12)"; e.target.style.boxShadow="none"; }}
                />
                <div style={{ color: "#a39e98", fontSize: "11px", fontFamily: "var(--font-ui)",
                              marginTop: "4px", letterSpacing: "-0.006em" }}>
                  Create a webhook at your Slack workspace: Apps → Incoming Webhooks
                </div>
              </div>
              {settings?.slack_webhook_url && (
                <button onClick={handleTestSlack} disabled={testingSlack} style={{
                  marginTop: "10px", padding: "6px 14px",
                  border: "1px solid rgba(74,21,75,0.25)", borderRadius: "6px",
                  background: "rgba(74,21,75,0.05)", color: "#4A154B",
                  fontFamily: "var(--font-ui)", fontSize: "12px", fontWeight: 600,
                  cursor: testingSlack ? "not-allowed" : "pointer",
                  letterSpacing: "-0.006em", transition: "background 0.12s ease",
                }}
                  onMouseEnter={e => { if (!testingSlack) e.currentTarget.style.background="rgba(74,21,75,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(74,21,75,0.05)"; }}
                >
                  {testingSlack ? "Sending…" : "Send test message"}
                </button>
              )}
            </div>

            {msg && (
              <div style={{
                padding: "9px 12px", borderRadius: "6px", marginBottom: "12px",
                background: msg.ok ? "rgba(58,138,96,0.07)" : "rgba(181,69,69,0.07)",
                color:      msg.ok ? "#3a8a60"              : "#b54545",
                border: `1px solid ${msg.ok ? "rgba(58,138,96,0.2)" : "rgba(181,69,69,0.2)"}`,
                fontSize: "12px", fontFamily: "var(--font-ui)", letterSpacing: "-0.006em",
              }}>{msg.text}</div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 2, padding: "9px 16px",
                background: saving ? "rgba(0,0,0,0.04)" : "#4b7bc9",
                border: "none", borderRadius: "6px",
                color: saving ? "#a39e98" : "#fff",
                fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "13px",
                cursor: saving ? "not-allowed" : "pointer", letterSpacing: "-0.006em",
                transition: "background 0.15s ease, transform 0.1s ease",
              }}
                onMouseDown={e => { if (!saving) e.currentTarget.style.transform="scale(0.98)"; }}
                onMouseUp={e   => { e.currentTarget.style.transform="scale(1)"; }}
              >{saving ? "Saving…" : "Save settings"}</button>
              {hasSettings && emailConfigured && (
                <button onClick={handleTest} disabled={testing} style={{
                  flex: 1, padding: "9px 16px", border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "6px", background: "rgba(0,0,0,0.03)",
                  color: "#615d59", fontFamily: "var(--font-ui)",
                  fontSize: "13px", cursor: "pointer", letterSpacing: "-0.006em",
                  transition: "background 0.12s ease",
                }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(0,0,0,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background="rgba(0,0,0,0.03)"}
                >{testing ? "Sending…" : "Send test"}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage({ token, role, userEmail }) {
  const canConfigure  = role !== "viewer";
  const isSuperadmin  = role === "superadmin";
  const canAdvanced   = role === "admin" || role === "superadmin";

  const [accounts,        setAccounts]        = useState([]);
  const [alertHistory,    setAlertHistory]    = useState([]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [tab,             setTab]             = useState("configure");
  const [smtpDiag,        setSmtpDiag]        = useState(null);
  const [diagLoading,     setDiagLoading]     = useState(false);
  const [testEmail,       setTestEmail]       = useState(userEmail || "");
  const [testSending,     setTestSending]     = useState(false);
  const [testMsg,         setTestMsg]         = useState(null);

  const [sysSettings,   setSysSettings]   = useState(null);
  const [sysSaving,     setSysSaving]     = useState(false);
  const [sysMsg,        setSysMsg]        = useState(null);
  const [sysEmail,      setSysEmail]      = useState("");
  const [sysThreshold,  setSysThreshold]  = useState(60);
  const [sysEnabled,    setSysEnabled]    = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [accRes, alertRes] = await Promise.all([
          fetch(`${API}/accounts`,        { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`${API}/alerts/settings`, { headers: { "Authorization": `Bearer ${token}` } }),
        ]);
        const accData   = await accRes.json();
        const alertData = await alertRes.json();
        setAccounts(accData.accounts || []);
        setEmailConfigured(alertData.email_configured || false);

        const histRes  = await fetch(`${API}/alerts/history`, { headers: { "Authorization": `Bearer ${token}` } });
        const histData = await histRes.json();
        setAlertHistory(histData.history || []);

        if (isSuperadmin) {
          try {
            const sysRes  = await fetch(`${API}/system-alerts/settings`, { headers: { "Authorization": `Bearer ${token}` } });
            const sysData = await sysRes.json();
            if (sysData.settings) {
              const s = sysData.settings;
              setSysSettings(s); setSysEmail(s.email || "");
              setSysThreshold(s.score_threshold ?? 60); setSysEnabled(s.enabled ?? true);
            }
          } catch {}
        }
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, [token, isSuperadmin]);

  async function saveSysAlerts() {
    setSysSaving(true); setSysMsg(null);
    try {
      const res = await fetch(`${API}/system-alerts/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ email: sysEmail, score_threshold: sysThreshold, enabled: sysEnabled }),
      });
      const data = await res.json();
      if (res.ok) { setSysSettings(data.settings); setSysMsg({ ok: true, text: "Platform alert saved" }); }
      else setSysMsg({ ok: false, text: data.detail || "Save failed." });
    } catch { setSysMsg({ ok: false, text: "Unable to connect. Please try again." }); }
    finally { setSysSaving(false); }
  }

  async function runSmtpDiag() {
    setDiagLoading(true); setSmtpDiag(null);
    try {
      const res  = await fetch(`${API}/admin/email-test`, { headers: { "Authorization": `Bearer ${token}` } });
      setSmtpDiag(await res.json());
    } catch { setSmtpDiag({ error: "Cannot reach backend server." }); }
    finally { setDiagLoading(false); }
  }

  async function sendTestEmail() {
    if (!testEmail) return;
    setTestSending(true); setTestMsg(null);
    try {
      const res  = await fetch(`${API}/admin/email-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ to_email: testEmail }),
      });
      const data = await res.json();
      if (res.ok) setTestMsg({ ok: true, text: `Test email sent to ${data.to}` });
      else setTestMsg({ ok: false, text: data.detail || "Send failed." });
    } catch { setTestMsg({ ok: false, text: "Cannot reach backend server." }); }
    finally { setTestSending(false); }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                  height: "60vh", color: "#a39e98", fontFamily: "var(--font-ui)", fontSize: "13px",
                  gap: 10 }}>
      <span style={{ display:"inline-block", width:13, height:13, borderRadius:"50%",
                     border:"2px solid rgba(0,0,0,0.1)", borderTopColor:"#4b7bc9",
                     animation:"spin 0.7s linear infinite" }} />
      Loading alerts…
    </div>
  );

  return (
    <div style={{ padding: "28px 32px 52px", maxWidth: "860px", margin: "0 auto",
                  animation: "floatIn 0.28s cubic-bezier(0.23,1,0.32,1) both" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700,
                     color: "rgba(0,0,0,0.9)", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.2 }}>
          Alerts
        </h1>
        <p style={{ color: "#a39e98", fontSize: "13px", marginTop: "4px",
                    fontFamily: "var(--font-ui)", letterSpacing: "-0.006em" }}>
          Email and Slack notifications when your security posture changes
        </p>
      </div>

      {/* Platform Alert card — superadmin only */}
      {isSuperadmin && (
        <div style={{
          background: "#fff", border: "1px solid rgba(0,0,0,0.09)",
          borderRadius: "12px", padding: "20px 22px", marginBottom: "16px",
          boxShadow: "rgba(0,0,0,0.03) 0px 2px 8px, rgba(0,0,0,0.02) 0px 1px 3px",
          borderTop: "2px solid #4b7bc9",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <span style={{
              background: "rgba(75,123,201,0.08)", color: "#4b7bc9", fontSize: "10px",
              fontWeight: 600, padding: "3px 9px", borderRadius: "9999px",
              fontFamily: "var(--font-ui)", border: "1px solid rgba(75,123,201,0.2)",
            }}>Superadmin</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "14px",
                           fontWeight: 600, color: "rgba(0,0,0,0.9)", letterSpacing: "-0.006em" }}>
              Platform alert
            </span>
            <span style={{ color: "#a39e98", fontSize: "12px", fontFamily: "var(--font-ui)", letterSpacing: "-0.006em" }}>
              · System-wide threshold
            </span>
          </div>

          <Toggle value={sysEnabled} onChange={setSysEnabled}
            label="Enable platform-wide alerting"
            sub="Sends alert when overall platform posture drops below threshold" />

          <div style={{ marginBottom: "12px", marginTop: "14px" }}>
            <label style={labelStyle}>Platform alert email</label>
            <input type="email" placeholder="platform-alerts@yourcompany.com"
              value={sysEmail} onChange={e => setSysEmail(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor="#4b7bc9"; e.target.style.boxShadow="0 0 0 3px rgba(75,123,201,0.14)"; }}
              onBlur={e  => { e.target.style.borderColor="rgba(0,0,0,0.12)"; e.target.style.boxShadow="none"; }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Platform score threshold</label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="range" min="0" max="100" value={sysThreshold}
                onChange={e => setSysThreshold(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#4b7bc9" }} />
              <span style={{
                fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700,
                color: "rgba(0,0,0,0.7)", minWidth: "36px", textAlign: "right",
                letterSpacing: "-0.02em",
              }}>{sysThreshold}</span>
            </div>
            <div style={{ color: "#a39e98", fontSize: "11px", fontFamily: "var(--font-ui)", marginTop: "4px", letterSpacing: "-0.006em" }}>
              Alert when platform score drops to or below {sysThreshold}
            </div>
          </div>

          {sysMsg && (
            <div style={{
              padding: "9px 12px", borderRadius: "6px", marginBottom: "12px",
              background: sysMsg.ok ? "rgba(58,138,96,0.07)" : "rgba(181,69,69,0.07)",
              color:      sysMsg.ok ? "#3a8a60"              : "#b54545",
              border: `1px solid ${sysMsg.ok ? "rgba(58,138,96,0.2)" : "rgba(181,69,69,0.2)"}`,
              fontSize: "12px", fontFamily: "var(--font-ui)", letterSpacing: "-0.006em",
            }}>{sysMsg.text}</div>
          )}

          <button onClick={saveSysAlerts} disabled={sysSaving} style={{
            padding: "9px 20px",
            background: sysSaving ? "rgba(0,0,0,0.04)" : "#4b7bc9",
            border: "none", borderRadius: "6px",
            color: sysSaving ? "#a39e98" : "#fff",
            fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "13px",
            cursor: sysSaving ? "not-allowed" : "pointer", letterSpacing: "-0.006em",
            transition: "background 0.15s ease, transform 0.1s ease",
          }}
            onMouseDown={e => { if (!sysSaving) e.currentTarget.style.transform="scale(0.98)"; }}
            onMouseUp={e   => { e.currentTarget.style.transform="scale(1)"; }}
          >{sysSaving ? "Saving…" : "Save platform alert"}</button>
        </div>
      )}

      {/* Email status banner */}
      <div style={{
        padding: "14px 16px", borderRadius: "10px", marginBottom: "16px",
        background: emailConfigured ? "rgba(58,138,96,0.06)" : "rgba(154,125,24,0.06)",
        border: `1px solid ${emailConfigured ? "rgba(58,138,96,0.2)" : "rgba(154,125,24,0.2)"}`,
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={emailConfigured ? "#3a8a60" : "#9a7d18"} strokeWidth="2">
          {emailConfigured
            ? <><polyline points="20 6 9 17 4 12"/></>
            : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
          }
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{
            color: emailConfigured ? "#3a8a60" : "#9a7d18",
            fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "13px",
            letterSpacing: "-0.006em",
          }}>
            {emailConfigured ? "Email alerts active" : "Email alerts not configured"}
          </div>
          <div style={{ color: "#a39e98", fontSize: "12px", fontFamily: "var(--font-ui)", marginTop: "2px", letterSpacing: "-0.006em" }}>
            {emailConfigured
              ? "Alerts will be sent automatically after each scheduled scan"
              : canConfigure ? "Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD to your .env file"
                             : "Contact your administrator to configure email alerts"}
          </div>
        </div>
        {emailConfigured && canConfigure && (
          <button onClick={runSmtpDiag} disabled={diagLoading} style={{
            padding: "6px 14px", background: "transparent", cursor: "pointer",
            border: "1px solid rgba(58,138,96,0.3)", borderRadius: "6px",
            color: "#3a8a60", fontFamily: "var(--font-ui)",
            fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap",
            letterSpacing: "-0.006em", transition: "background 0.12s ease",
          }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(58,138,96,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}
          >
            {diagLoading ? "Testing…" : "Test connection"}
          </button>
        )}
      </div>

      {/* SMTP Diagnostics */}
      {canConfigure && smtpDiag && (
        <div style={{
          padding: "16px 20px", borderRadius: "10px", marginBottom: "16px",
          background: "#f6f5f4", border: "1px solid rgba(0,0,0,0.09)",
        }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "12px", fontWeight: 600,
                        color: "#a39e98", letterSpacing: "0.04em", textTransform: "uppercase",
                        marginBottom: "12px" }}>SMTP diagnostics</div>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr",
                        gap: "6px 12px", fontFamily: "var(--font-ui)", fontSize: "13px" }}>
            {[
              ["Host", smtpDiag.host], ["Port", smtpDiag.port],
              ["Auth user", smtpDiag.user], ["From address", smtpDiag.from],
              ["Connected", smtpDiag.connected ? "✓ Yes" : "✗ No"],
              ["Auth OK",   smtpDiag.auth_ok   ? "✓ Yes" : "✗ No"],
            ].map(([k, v]) => (
              <>
                <span key={`k-${k}`} style={{ color: "#a39e98" }}>{k}</span>
                <span key={`v-${k}`} style={{
                  color: String(v).startsWith("✓") ? "#3a8a60"
                       : String(v).startsWith("✗") ? "#b54545"
                       : "#615d59",
                }}>{v}</span>
              </>
            ))}
          </div>
          {smtpDiag.error && (
            <div style={{ marginTop: "10px", padding: "9px 12px", borderRadius: "6px",
                          background: "rgba(181,69,69,0.07)", color: "#b54545",
                          border: "1px solid rgba(181,69,69,0.2)",
                          fontFamily: "var(--font-ui)", fontSize: "12px", letterSpacing: "-0.006em" }}>
              {smtpDiag.error}
            </div>
          )}
          {smtpDiag.auth_ok && (
            <div style={{ marginTop: "14px", borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "14px" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: "11px", color: "#a39e98",
                            marginBottom: "8px", fontWeight: 600, letterSpacing: "0.04em",
                            textTransform: "uppercase" }}>Send test email</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="email" placeholder="recipient@example.com" value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  style={{ flex: 1, ...inputStyle }}
                  onFocus={e => { e.target.style.borderColor="#4b7bc9"; e.target.style.boxShadow="0 0 0 3px rgba(75,123,201,0.14)"; }}
                  onBlur={e  => { e.target.style.borderColor="rgba(0,0,0,0.12)"; e.target.style.boxShadow="none"; }}
                />
                <button onClick={sendTestEmail} disabled={testSending || !testEmail} style={{
                  padding: "7px 16px", background: "#4b7bc9", cursor: "pointer",
                  border: "none", borderRadius: "6px",
                  color: "#fff", fontFamily: "var(--font-ui)", fontSize: "12px", fontWeight: 600,
                  letterSpacing: "-0.006em",
                }}>
                  {testSending ? "Sending…" : "Send test"}
                </button>
              </div>
              {testMsg && (
                <div style={{ marginTop: "8px", padding: "9px 12px", borderRadius: "6px",
                              background: testMsg.ok ? "rgba(58,138,96,0.07)" : "rgba(181,69,69,0.07)",
                              color: testMsg.ok ? "#3a8a60" : "#b54545",
                              border: `1px solid ${testMsg.ok ? "rgba(58,138,96,0.2)" : "rgba(181,69,69,0.2)"}`,
                              fontFamily: "var(--font-ui)", fontSize: "12px", letterSpacing: "-0.006em" }}>
                  {testMsg.text}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.09)", marginBottom: "20px", gap: 0 }}>
        {[
          { id: "configure", label: canConfigure ? "Configure alerts" : "Alert status" },
          { id: "history",   label: `History (${alertHistory.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px", border: "none", cursor: "pointer",
            background: "transparent",
            color: tab === t.id ? "rgba(0,0,0,0.9)" : "#a39e98",
            fontFamily: "var(--font-ui)", fontWeight: tab === t.id ? 600 : 400,
            fontSize: "13px", letterSpacing: "-0.006em",
            borderBottom: tab === t.id ? "2px solid #4b7bc9" : "2px solid transparent",
            marginBottom: "-1px", transition: "color 0.12s ease",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Configure tab */}
      {tab === "configure" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {accounts.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px", color: "#a39e98",
                          fontFamily: "var(--font-ui)", fontSize: "13px" }}>
              No accounts added yet.
            </div>
          )}
          {accounts.map(account => (
            <AccountAlertCard key={account.id} account={account} token={token}
              emailConfigured={emailConfigured} userEmail={userEmail}
              readOnly={!canConfigure} canAdvanced={canAdvanced} />
          ))}
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div style={{
          background: "#fff", border: "1px solid rgba(0,0,0,0.09)",
          borderRadius: "10px", overflow: "hidden",
          boxShadow: "rgba(0,0,0,0.03) 0px 2px 8px",
        }}>
          {alertHistory.length === 0 && (
            <div style={{ padding: "48px", textAlign: "center", color: "#a39e98",
                          fontFamily: "var(--font-ui)", fontSize: "13px" }}>
              No alerts have fired yet.
            </div>
          )}
          {alertHistory.map((h, i) => (
            <div key={h.id || i} style={{
              display: "grid", gridTemplateColumns: "160px 140px 50px 1fr 80px",
              gap: "12px", alignItems: "center", padding: "12px 20px",
              borderBottom: "1px solid rgba(0,0,0,0.07)",
              background: i % 2 === 0 ? "transparent" : "#f6f5f4",
            }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "11px", color: "#a39e98", letterSpacing: "-0.006em" }}>
                {(h.created_at || "").slice(0,16).replace("T"," ")}
              </span>
              <span style={{ color: "rgba(0,0,0,0.9)", fontSize: "13px",
                             fontFamily: "var(--font-ui)", fontWeight: 600, letterSpacing: "-0.006em" }}>
                {h.account_name || "—"}
              </span>
              <span style={{
                color: h.score >= 80 ? "#3a8a60" : h.score >= 60 ? "#9a7d18"
                     : h.score >= 40 ? "#b06c2a" : "#b54545",
                fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700,
                letterSpacing: "-0.02em",
              }}>{h.score ?? "—"}</span>
              <span style={{ color: "#615d59", fontSize: "12px", fontFamily: "var(--font-ui)", letterSpacing: "-0.006em" }}>
                {h.trigger || "—"}
              </span>
              <span style={{
                color: h.email_sent ? "#3a8a60" : "#b54545",
                fontSize: "11px", fontFamily: "var(--font-ui)", fontWeight: 600,
                letterSpacing: "-0.006em",
              }}>
                {h.email_sent ? "Sent ✓" : "Failed ✗"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
