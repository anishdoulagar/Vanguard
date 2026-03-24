import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

function Toggle({ value, onChange, label, sub }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 14px", background: "var(--card)",
      border: "1px solid var(--border)", borderRadius: "8px",
      cursor: "pointer", marginBottom: "10px",
    }}>
      <div>
        <div style={{ color: "var(--accent)", fontSize: "13px",
                      fontFamily: "var(--font-ui)", fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ color: "var(--accent3)", fontSize: "11px",
                              fontFamily: "var(--font-mono)", marginTop: "2px" }}>{sub}</div>}
      </div>
      <div style={{
        width: "42px", height: "24px", borderRadius: "12px",
        background: value ? "var(--cyan)" : "var(--border)",
        boxShadow: value ? "var(--glow-cyan)" : "none",
        position: "relative", flexShrink: 0, transition: "background 0.2s",
      }}>
        <div style={{
          position: "absolute", top: "3px",
          left: value ? "21px" : "3px",
          width: "18px", height: "18px", borderRadius: "50%",
          background: value ? "var(--bg)" : "var(--accent3)",
          transition: "left 0.2s",
        }} />
      </div>
    </div>
  );
}

function AccountAlertCard({ account, token, emailConfigured, userEmail, readOnly, canAdvanced }) {
  const [settings,      setSettings]      = useState(null);
  const [email,         setEmail]         = useState(userEmail || "");
  const [threshold,     setThreshold]     = useState(70);
  const [onCrit,        setOnCrit]        = useState(true);
  const [onHigh,        setOnHigh]        = useState(false);
  const [onMedium,      setOnMedium]      = useState(false);
  const [onNewFinding,  setOnNewFinding]  = useState(false);
  const [enabled,       setEnabled]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [testing,       setTesting]       = useState(false);
  const [msg,           setMsg]           = useState(null);
  const [open,          setOpen]          = useState(false);

  useEffect(() => {
    fetch(`${API}/alerts/settings/${account.id}`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
    .then(r => r.json())
    .then(d => {
      if (d.settings) {
        const s = d.settings;
        setSettings(s);
        setEmail(s.email);
        setThreshold(s.score_threshold);
        setOnCrit(s.alert_on_critical);
        setOnHigh(s.alert_on_high);
        setOnMedium(s.alert_on_medium ?? false);
        setOnNewFinding(s.alert_on_new_finding ?? false);
        setEnabled(s.enabled);
      }
    })
    .catch(() => {});
  }, [account.id, token]);

  async function handleSave() {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/alerts/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
                   "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          account_id: account.id, email, score_threshold: threshold,
          alert_on_critical: onCrit, alert_on_high: onHigh,
          alert_on_medium: onMedium, alert_on_new_finding: onNewFinding,
          enabled,
        }),
      });
      const data = await res.json();
      if (res.ok) { setSettings(data.settings); setMsg({ ok: true, text: "Saved ✓" }); }
      else setMsg({ ok: false, text: data.detail || "Save failed." });
    } catch { setMsg({ ok: false, text: "Unable to connect. Please try again." }); }
    finally { setSaving(false); }
  }

  async function handleTest() {
    setTesting(true); setMsg(null);
    try {
      const res = await fetch(`${API}/alerts/test/${account.id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setMsg({ ok: true, text: `Test email sent to ${data.to}` });
      else setMsg({ ok: false, text: data.detail || "Test failed." });
    } catch { setMsg({ ok: false, text: "Unable to connect. Please try again." }); }
    finally { setTesting(false); }
  }

  const hasSettings = !!settings;

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "10px", overflow: "hidden",
      borderLeft: `3px solid ${account.cloud === "aws" ? "#ff9900" : "#0089d6"}`,
    }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            background: account.cloud === "aws" ? "#ff9900" : "#0089d6",
            color: "#000", fontSize: "9px", fontWeight: 700,
            padding: "2px 6px", borderRadius: "3px", fontFamily: "var(--font-ui)",
          }}>{account.cloud.toUpperCase()}</span>
          <span style={{ color: "var(--accent)", fontSize: "14px",
                         fontWeight: 700, fontFamily: "var(--font-display)" }}>
            {account.name}
          </span>
          {hasSettings && enabled && (
            <span style={{ fontSize: "10px", color: "var(--green)",
                           fontFamily: "var(--font-ui)", fontWeight: 700 }}>● ACTIVE</span>
          )}
          {hasSettings && !enabled && (
            <span style={{ fontSize: "10px", color: "var(--accent3)",
                           fontFamily: "var(--font-ui)" }}>○ DISABLED</span>
          )}
          {!hasSettings && (
            <span style={{ fontSize: "10px", color: "var(--accent3)",
                           fontFamily: "var(--font-ui)" }}>NOT CONFIGURED</span>
          )}
        </div>
        <span style={{ color: "var(--accent3)", fontSize: "12px" }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {/* Read-only status panel for viewers */}
      {open && readOnly && (
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
          {!settings ? (
            <div style={{ color: "var(--accent3)", fontSize: "12px",
                          fontFamily: "var(--font-mono)" }}>
              No alert settings configured for this account.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr",
                          gap: "8px 12px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
              {[
                ["Alert email", email || "—"],
                ["Score threshold", `≤ ${threshold}`],
                ["Critical findings", onCrit ? "Enabled" : "Disabled"],
                ["High findings",     onHigh ? "Enabled" : "Disabled"],
              ].map(([k, v]) => (
                <>
                  <span key={`k-${k}`} style={{ color: "var(--accent3)" }}>{k}</span>
                  <span key={`v-${k}`} style={{ color: "var(--accent2)" }}>{v}</span>
                </>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Config panel */}
      {open && !readOnly && (
        <div style={{ padding: "0 20px 20px",
                      borderTop: "1px solid var(--border)" }}>
          <div style={{ paddingTop: "16px" }}>

            {!emailConfigured && (
              <div style={{
                padding: "10px 14px", borderRadius: "6px", marginBottom: "16px",
                background: "rgba(201,168,76,0.1)", color: "var(--yellow)",
                border: "1px solid rgba(201,168,76,0.3)",
                fontSize: "12px", fontFamily: "var(--font-mono)",
              }}>
                ⚠ Email alerts not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASSWORD
                to your .env file then restart the backend.
              </div>
            )}

            <Toggle value={enabled} onChange={setEnabled}
              label="Enable alerts for this account"
              sub="Sends email when alert conditions are met" />

            <div style={{ marginBottom: "14px", marginTop: "16px" }}>
              <label style={labelStyle}>ALERT EMAIL ADDRESS</label>
              <input type="email" placeholder="alerts@yourcompany.com"
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>SCORE THRESHOLD</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input type="range" min="0" max="100" value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--accent)" }} />
                <span style={{
                  fontFamily: "var(--font-display)", fontSize: "20px",
                  fontWeight: 700, color: threshold >= 80 ? "var(--green)"
                    : threshold >= 60 ? "var(--yellow)"
                    : threshold >= 40 ? "var(--orange)" : "var(--red)",
                  minWidth: "40px", textAlign: "right",
                }}>{threshold}</span>
              </div>
              <div style={{ color: "var(--accent3)", fontSize: "11px",
                            fontFamily: "var(--font-mono)", marginTop: "4px" }}>
                Alert when score drops at or below {threshold}
              </div>
            </div>

            <Toggle value={onCrit} onChange={setOnCrit}
              label="Alert on CRITICAL findings"
              sub="Triggers immediately when any CRITICAL finding is detected" />
            <Toggle value={onHigh} onChange={setOnHigh}
              label="Alert on HIGH findings"
              sub="Triggers when any HIGH severity finding is detected" />

            {canAdvanced && (
              <Toggle value={onMedium} onChange={setOnMedium}
                label="Alert on MEDIUM findings"
                sub="Triggers when any MEDIUM severity finding is detected" />
            )}
            {canAdvanced && (
              <Toggle value={onNewFinding} onChange={setOnNewFinding}
                label="Alert on any new finding"
                sub="Triggers whenever a new finding appears, regardless of severity" />
            )}

            {msg && (
              <div style={{
                padding: "8px 12px", borderRadius: "6px", marginBottom: "12px",
                background: msg.ok ? "rgba(76,175,125,0.1)" : "rgba(224,85,85,0.1)",
                color:      msg.ok ? "var(--green)"         : "var(--red)",
                border: `1px solid ${msg.ok ? "rgba(76,175,125,0.3)" : "rgba(224,85,85,0.3)"}`,
                fontSize: "12px", fontFamily: "var(--font-mono)",
              }}>{msg.text}</div>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleSave} disabled={saving} className="neon-btn" style={{
                flex: 2, padding: "9px",
                border: `1px solid ${saving ? "rgba(255,230,0,0.2)" : "var(--cyan)"}`,
                borderRadius: "6px", background: "transparent",
                color: saving ? "rgba(255,230,0,0.4)" : "var(--cyan)",
                fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "12px",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "var(--glow-cyan)",
              }}>{saving ? "SAVING..." : "SAVE SETTINGS"}</button>
              {hasSettings && emailConfigured && (
                <button onClick={handleTest} disabled={testing} style={{
                  flex: 1, padding: "9px", border: "1px solid var(--border)",
                  borderRadius: "6px", background: "transparent",
                  color: "var(--accent2)", fontFamily: "var(--font-ui)",
                  fontSize: "12px", cursor: "pointer",
                }}>{testing ? "SENDING..." : "SEND TEST"}</button>
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

  // System alert state (superadmin only)
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
          fetch(`${API}/accounts`,       { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`${API}/alerts/settings`, { headers: { "Authorization": `Bearer ${token}` } }),
        ]);
        const accData   = await accRes.json();
        const alertData = await alertRes.json();
        setAccounts(accData.accounts || []);
        setEmailConfigured(alertData.email_configured || false);

        const histRes  = await fetch(`${API}/alerts/history`,
          { headers: { "Authorization": `Bearer ${token}` } });
        const histData = await histRes.json();
        setAlertHistory(histData.history || []);

        // Load system alert settings for superadmin
        if (isSuperadmin) {
          try {
            const sysRes  = await fetch(`${API}/system-alerts/settings`,
              { headers: { "Authorization": `Bearer ${token}` } });
            const sysData = await sysRes.json();
            if (sysData.settings) {
              const s = sysData.settings;
              setSysSettings(s);
              setSysEmail(s.email || "");
              setSysThreshold(s.score_threshold ?? 60);
              setSysEnabled(s.enabled ?? true);
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
        headers: { "Content-Type": "application/json",
                   "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          email: sysEmail, score_threshold: sysThreshold, enabled: sysEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok) { setSysSettings(data.settings); setSysMsg({ ok: true, text: "Saved ✓" }); }
      else setSysMsg({ ok: false, text: data.detail || "Save failed." });
    } catch { setSysMsg({ ok: false, text: "Unable to connect. Please try again." }); }
    finally { setSysSaving(false); }
  }

  async function runSmtpDiag() {
    setDiagLoading(true); setSmtpDiag(null);
    try {
      const res  = await fetch(`${API}/admin/email-test`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      setSmtpDiag(data);
    } catch {
      setSmtpDiag({ error: "Cannot reach backend server." });
    } finally { setDiagLoading(false); }
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
    } catch {
      setTestMsg({ ok: false, text: "Cannot reach backend server." });
    } finally { setTestSending(false); }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                  height: "60vh", color: "var(--accent3)",
                  fontFamily: "var(--font-mono)", fontSize: "12px" }}>
      LOADING...
    </div>
  );

  return (
    <div style={{ padding: "32px", maxWidth: "900px", margin: "0 auto",
                  animation: "fadeIn 0.3s ease" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px",
                     fontWeight: 700, color: "var(--accent)",
                     letterSpacing: "0.05em", margin: 0 }}>ALERTS</h1>
        <p style={{ color: "var(--accent3)", fontSize: "13px",
                    marginTop: "4px", fontFamily: "var(--font-mono)" }}>
          Email notifications when your security posture changes
        </p>
      </div>

      {/* Platform Alert card — superadmin only */}
      {isSuperadmin && (
        <div style={{
          background: "var(--card)", border: "1px solid rgba(255,230,0,0.25)",
          borderRadius: "10px", padding: "20px", marginBottom: "20px",
          borderLeft: "3px solid var(--accent)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{
              background: "var(--accent)", color: "#000", fontSize: "9px",
              fontWeight: 700, padding: "2px 7px", borderRadius: "3px",
              fontFamily: "var(--font-ui)", letterSpacing: "0.08em",
            }}>SUPERADMIN</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "14px",
                           fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em" }}>
              PLATFORM ALERT
            </span>
            <span style={{ color: "var(--accent3)", fontSize: "11px",
                           fontFamily: "var(--font-mono)" }}>
              — system-wide threshold configured by superadmin
            </span>
          </div>

          <Toggle value={sysEnabled} onChange={setSysEnabled}
            label="Enable platform-wide alerting"
            sub="Sends alert when overall platform posture drops below threshold" />

          <div style={{ marginBottom: "14px", marginTop: "4px" }}>
            <label style={labelStyle}>PLATFORM ALERT EMAIL</label>
            <input type="email" placeholder="platform-alerts@yourcompany.com"
              value={sysEmail} onChange={e => setSysEmail(e.target.value)}
              style={inputStyle} />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>PLATFORM SCORE THRESHOLD</label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="range" min="0" max="100" value={sysThreshold}
                onChange={e => setSysThreshold(Number(e.target.value))}
                style={{ flex: 1, accentColor: "var(--accent)" }} />
              <span style={{
                fontFamily: "var(--font-display)", fontSize: "20px",
                fontWeight: 700,
                color: sysThreshold >= 80 ? "var(--green)"
                     : sysThreshold >= 60 ? "var(--yellow)"
                     : sysThreshold >= 40 ? "var(--orange)" : "var(--red)",
                minWidth: "40px", textAlign: "right",
              }}>{sysThreshold}</span>
            </div>
            <div style={{ color: "var(--accent3)", fontSize: "11px",
                          fontFamily: "var(--font-mono)", marginTop: "4px" }}>
              Alert when platform score drops to or below {sysThreshold}
            </div>
          </div>

          {sysMsg && (
            <div style={{
              padding: "8px 12px", borderRadius: "6px", marginBottom: "12px",
              background: sysMsg.ok ? "rgba(76,175,125,0.1)" : "rgba(224,85,85,0.1)",
              color:      sysMsg.ok ? "var(--green)"         : "var(--red)",
              border: `1px solid ${sysMsg.ok ? "rgba(76,175,125,0.3)" : "rgba(224,85,85,0.3)"}`,
              fontSize: "12px", fontFamily: "var(--font-mono)",
            }}>{sysMsg.text}</div>
          )}

          <button onClick={saveSysAlerts} disabled={sysSaving} className="neon-btn" style={{
            padding: "9px 24px",
            border: `1px solid ${sysSaving ? "rgba(255,230,0,0.2)" : "var(--accent)"}`,
            borderRadius: "6px", background: "transparent",
            color: sysSaving ? "rgba(255,230,0,0.4)" : "var(--accent)",
            fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "12px",
            cursor: sysSaving ? "not-allowed" : "pointer",
            boxShadow: sysSaving ? "none" : "var(--glow)",
          }}>{sysSaving ? "SAVING..." : "SAVE PLATFORM ALERT"}</button>
        </div>
      )}

      {/* Email status banner */}
      <div style={{
        padding: "14px 16px", borderRadius: "8px", marginBottom: "16px",
        background: emailConfigured ? "rgba(76,175,125,0.08)" : "rgba(201,168,76,0.08)",
        border: `1px solid ${emailConfigured ? "rgba(76,175,125,0.25)" : "rgba(201,168,76,0.25)"}`,
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        <span style={{ fontSize: "18px" }}>{emailConfigured ? "✓" : "⚠"}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            color: emailConfigured ? "var(--green)" : "var(--yellow)",
            fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "13px",
          }}>
            {emailConfigured ? "Email alerts active" : "Email alerts not configured"}
          </div>
          <div style={{ color: "var(--accent3)", fontSize: "11px",
                        fontFamily: "var(--font-mono)", marginTop: "2px" }}>
            {emailConfigured
              ? "Alerts will be sent automatically after each scheduled scan"
              : canConfigure ? "Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD to your .env file"
                             : "Contact your administrator to configure email alerts"}
          </div>
        </div>
        {emailConfigured && canConfigure && (
          <button onClick={runSmtpDiag} disabled={diagLoading} style={{
            padding: "6px 14px", background: "transparent", cursor: "pointer",
            border: "1px solid rgba(76,175,125,0.35)", borderRadius: "5px",
            color: "var(--green)", fontFamily: "var(--font-ui)",
            fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap",
          }}>
            {diagLoading ? "TESTING..." : "TEST CONNECTION"}
          </button>
        )}
      </div>

      {/* SMTP Diagnostics panel — hidden for viewers */}
      {canConfigure && smtpDiag && <div style={{
        padding: "16px 20px", borderRadius: "8px", marginBottom: "16px",
        background: "var(--surface)", border: "1px solid var(--border)",
      }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "12px",
                      fontWeight: 700, color: "var(--accent3)",
                      letterSpacing: "0.08em", marginBottom: "12px" }}>
          SMTP DIAGNOSTICS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr",
                      gap: "6px 12px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
          {[
            ["Host", smtpDiag.host],
            ["Port", smtpDiag.port],
            ["Auth User", smtpDiag.user],
            ["From Address", smtpDiag.from],
            ["Connected", smtpDiag.connected ? "✓ Yes" : "✗ No"],
            ["Auth OK", smtpDiag.auth_ok ? "✓ Yes" : "✗ No"],
          ].map(([k, v]) => (
            <>
              <span key={`k-${k}`} style={{ color: "var(--accent3)" }}>{k}</span>
              <span key={`v-${k}`} style={{
                color: String(v).startsWith("✓") ? "var(--green)"
                     : String(v).startsWith("✗") ? "#e05555"
                     : "var(--accent2)",
              }}>{v}</span>
            </>
          ))}
        </div>
        {smtpDiag.error && (
          <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "5px",
                        background: "rgba(224,85,85,0.08)", color: "#e05555",
                        border: "1px solid rgba(224,85,85,0.25)",
                        fontFamily: "var(--font-mono)", fontSize: "11px" }}>
            ⚠ {smtpDiag.error}
          </div>
        )}
        {smtpDiag.auth_ok && (
          <div style={{ marginTop: "14px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: "11px",
                          color: "var(--accent3)", marginBottom: "8px",
                          fontWeight: 600, letterSpacing: "0.06em" }}>
              SEND TEST EMAIL
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="email"
                placeholder="recipient@example.com"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                style={{ flex: 1, background: "var(--card)",
                  border: "1px solid var(--border)", borderRadius: "5px",
                  padding: "7px 10px", color: "var(--accent)",
                  fontFamily: "var(--font-mono)", fontSize: "12px" }}
              />
              <button onClick={sendTestEmail} disabled={testSending || !testEmail} style={{
                padding: "7px 16px", background: "transparent", cursor: "pointer",
                border: "1px solid rgba(255,230,0,0.3)", borderRadius: "5px",
                color: "var(--cyan)", fontFamily: "var(--font-ui)",
                fontSize: "11px", fontWeight: 700,
              }}>
                {testSending ? "SENDING..." : "SEND TEST"}
              </button>
            </div>
            {testMsg && (
              <div style={{ marginTop: "8px", padding: "8px 12px", borderRadius: "5px",
                            background: testMsg.ok ? "rgba(76,175,125,0.08)" : "rgba(224,85,85,0.08)",
                            color: testMsg.ok ? "var(--green)" : "#e05555",
                            border: `1px solid ${testMsg.ok ? "rgba(76,175,125,0.25)" : "rgba(224,85,85,0.25)"}`,
                            fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                {testMsg.text}
              </div>
            )}
            {smtpDiag.auth_ok && (
              <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "5px",
                            background: "rgba(255,230,0,0.04)", color: "var(--accent3)",
                            border: "1px solid rgba(255,230,0,0.08)",
                            fontFamily: "var(--font-mono)", fontSize: "10px", lineHeight: 1.5 }}>
                ⓘ If the test email doesn't arrive, check: (1) your Brevo/provider dashboard for bounces,
                (2) verify SMTP_FROM is a verified sender address in your email provider,
                (3) check spam/junk folder.
              </div>
            )}
          </div>
        )}
      </div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", marginBottom: "20px",
                    background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: "8px", overflow: "hidden" }}>
        {[
          { id: "configure", label: canConfigure ? "CONFIGURE ALERTS" : "ALERT STATUS" },
          { id: "history",   label: `ALERT HISTORY (${alertHistory.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "11px", border: "none", cursor: "pointer",
            background: tab === t.id ? "var(--surface)" : "transparent",
            color:      tab === t.id ? "var(--accent)" : "var(--accent3)",
            fontFamily: "var(--font-ui)", fontWeight: tab === t.id ? 700 : 500,
            fontSize: "12px", letterSpacing: "0.06em",
            borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Configure / Status tab */}
      {tab === "configure" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {accounts.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px",
                          color: "var(--accent3)", fontFamily: "var(--font-ui)" }}>
              No accounts added yet.
            </div>
          )}
          {accounts.map(account => (
            <AccountAlertCard
              key={account.id} account={account}
              token={token} emailConfigured={emailConfigured}
              userEmail={userEmail} readOnly={!canConfigure}
              canAdvanced={canAdvanced}
            />
          ))}
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "10px", overflow: "hidden",
        }}>
          {alertHistory.length === 0 && (
            <div style={{ padding: "48px", textAlign: "center",
                          color: "var(--accent3)", fontFamily: "var(--font-mono)",
                          fontSize: "13px" }}>
              No alerts fired yet.
            </div>
          )}
          {alertHistory.map((h, i) => (
            <div key={h.id || i} style={{
              display: "grid",
              gridTemplateColumns: "160px 140px 60px 1fr 80px",
              gap: "12px", alignItems: "center",
              padding: "12px 20px",
              borderBottom: "1px solid var(--border)",
              background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.12)",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px",
                             color: "var(--accent2)" }}>
                {(h.created_at || "").slice(0,16).replace("T"," ")}
              </span>
              <span style={{ color: "var(--accent)", fontSize: "12px",
                             fontFamily: "var(--font-ui)", fontWeight: 600 }}>
                {h.account_name || "—"}
              </span>
              <span style={{
                color: h.score >= 80 ? "var(--green)" : h.score >= 60 ? "var(--yellow)"
                     : h.score >= 40 ? "var(--orange)" : "var(--red)",
                fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 700,
              }}>{h.score ?? "—"}</span>
              <span style={{ color: "var(--accent3)", fontSize: "11px",
                             fontFamily: "var(--font-mono)" }}>
                {h.trigger || "—"}
              </span>
              <span style={{
                color: h.email_sent ? "var(--green)" : "var(--red)",
                fontSize: "10px", fontFamily: "var(--font-ui)", fontWeight: 700,
              }}>
                {h.email_sent ? "SENT ✓" : "FAILED ✗"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
