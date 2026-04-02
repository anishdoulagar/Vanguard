import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const inputStyle = {
  width: "100%", background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: "6px", padding: "9px 12px", color: "var(--accent)",
  fontFamily: "var(--font-mono)", fontSize: "13px",
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
      <input
        type={type} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)}
        style={inputStyle} autoComplete="off"
      />
    </div>
  );
}

// When keepInMemory is OFF — credentials are wiped when leaving ConnectPage.
// When keepInMemory is ON  — credentials persist in App state for the session.
export default function ConnectPage({
  onStartScan,
  savedCloud = "aws",
  savedAws   = { access_key_id: "", secret_access_key: "", region: "us-east-1" },
  savedAzure = { subscription_id: "", tenant_id: "", client_id: "", client_secret: "" },
  onCredsChange,
}) {
  const [cloud,         setCloud]         = useState(savedCloud);
  const [aws,           setAws]           = useState(savedAws);
  const [azure,         setAzure]         = useState(savedAzure);
  const [keepInMemory,  setKeepInMemory]  = useState(false);
  const [testing,       setTesting]       = useState(false);
  const [testResult,    setTestResult]    = useState(null);
  const [scanning,      setScanning]      = useState(false);

  function upCloud(val) {
    setCloud(val);
    setTestResult(null);
    if (keepInMemory) onCredsChange?.(val, aws, azure);
  }

  function upAws(k, v) {
    const next = { ...aws, [k]: v };
    setAws(next);
    if (keepInMemory) onCredsChange?.(cloud, next, azure);
  }

  function upAzure(k, v) {
    const next = { ...azure, [k]: v };
    setAzure(next);
    if (keepInMemory) onCredsChange?.(cloud, aws, next);
  }

  function toggleMemory(on) {
    setKeepInMemory(on);
    if (on) {
      // Immediately save current state up to App
      onCredsChange?.(cloud, aws, azure);
    } else {
      // Wipe saved state in App
      onCredsChange?.(
        "aws",
        { access_key_id: "", secret_access_key: "", region: "us-east-1" },
        { subscription_id: "", tenant_id: "", client_id: "", client_secret: "" }
      );
    }
  }

  function buildPayload() {
    return {
      cloud,
      aws:   cloud !== "azure" ? aws   : undefined,
      azure: cloud !== "aws"   ? azure : undefined,
    };
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res  = await fetch(`${API}/test-connection`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, msg: "Connection successful ✓" });
      } else {
        const errors = data.detail || {};
        const msg = typeof errors === "object"
          ? Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join(" | ")
          : String(errors);
        setTestResult({ ok: false, msg });
      }
    } catch {
      setTestResult({ ok: false, msg: "Unable to connect. Please check your credentials." });
    } finally {
      setTesting(false);
    }
  }

  function handleScan() {
    if (keepInMemory) onCredsChange?.(cloud, aws, azure);
    setScanning(true);
    onStartScan(buildPayload());
  }

  const CloudTab = ({ id, label }) => (
    <button onClick={() => upCloud(id)} style={{
      flex: 1, padding: "9px 0", border: "none", cursor: "pointer",
      background:    cloud === id ? "rgba(79,143,247,0.08)" : "transparent",
      color:         cloud === id ? "var(--cyan)"         : "var(--accent3)",
      fontFamily:    "var(--font-ui)", fontWeight: 700, fontSize: "12px",
      letterSpacing: "0.1em", transition: "all 0.15s",
      textShadow:    "none",
      borderBottom:  cloud === id ? "2px solid var(--cyan)" : "2px solid transparent",
    }}>{label}</button>
  );

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "40px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: "460px", animation: "fadeIn 0.3s ease" }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 900,
            color: "var(--cyan)", letterSpacing: "0.12em",
            textShadow: "none",
          }}>VANGUARD</h1>
          <p style={{ color: "var(--accent3)", fontSize: "11px", marginTop: "6px",
                      fontFamily: "var(--font-mono)", letterSpacing: "0.16em" }}>
            // QUICK SCAN
          </p>
        </div>

        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "28px",
          boxShadow: "none",
        }}>

          {/* Cloud Toggle */}
          <div style={{ marginBottom: "24px" }}>
            <label style={labelStyle}>CLOUD PROVIDER</label>
            <div style={{
              display: "flex", background: "var(--card)",
              border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden",
            }}>
              <CloudTab id="aws"   label="AWS"   />
              <CloudTab id="azure" label="AZURE" />
              <CloudTab id="all"   label="BOTH"  />
            </div>
          </div>

          {/* AWS Fields */}
          {cloud !== "azure" && (
            <div style={{ marginBottom: cloud === "all" ? "20px" : 0 }}>
              {cloud === "all" && (
                <div style={{
                  color: "var(--accent3)", fontSize: "10px", letterSpacing: "0.12em",
                  fontFamily: "var(--font-ui)", fontWeight: 700,
                  marginBottom: "12px", paddingBottom: "8px",
                  borderBottom: "1px solid var(--border)",
                }}>AWS CREDENTIALS</div>
              )}
              <Field label="ACCESS KEY ID" placeholder="AKIA..."
                     value={aws.access_key_id} onChange={v => upAws("access_key_id", v)} />
              <Field label="SECRET ACCESS KEY" type="password"
                     placeholder="••••••••••••••••••••••••••••••••••••••••"
                     value={aws.secret_access_key} onChange={v => upAws("secret_access_key", v)} />
              <Field label="REGION" placeholder="us-east-1"
                     value={aws.region} onChange={v => upAws("region", v)} />
            </div>
          )}

          {/* Azure Fields */}
          {cloud !== "aws" && (
            <div>
              {cloud === "all" && (
                <div style={{
                  color: "var(--accent3)", fontSize: "10px", letterSpacing: "0.12em",
                  fontFamily: "var(--font-ui)", fontWeight: 700,
                  marginBottom: "12px", paddingBottom: "8px",
                  borderBottom: "1px solid var(--border)",
                }}>AZURE CREDENTIALS</div>
              )}
              <Field label="SUBSCRIPTION ID"
                     placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                     value={azure.subscription_id} onChange={v => upAzure("subscription_id", v)} />
              <Field label="TENANT ID"
                     placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                     value={azure.tenant_id} onChange={v => upAzure("tenant_id", v)} />
              <Field label="CLIENT ID"
                     placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                     value={azure.client_id} onChange={v => upAzure("client_id", v)} />
              <Field label="CLIENT SECRET" type="password"
                     placeholder="••••••••••••••••••••••••••••••••"
                     value={azure.client_secret} onChange={v => upAzure("client_secret", v)} />
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div style={{
              padding: "9px 12px", borderRadius: "6px",
              marginTop: "16px", marginBottom: "4px",
              fontSize: "12px", fontFamily: "var(--font-mono)",
              background: testResult.ok ? "rgba(76,175,125,0.1)" : "rgba(224,85,85,0.1)",
              color:      testResult.ok ? "var(--green)"         : "var(--red)",
              border: `1px solid ${testResult.ok ? "rgba(76,175,125,0.3)" : "rgba(224,85,85,0.3)"}`,
            }}>
              {testResult.msg}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button onClick={handleTest} disabled={testing} className="neon-btn" style={{
              flex: 1, padding: "10px",
              border: "1px solid var(--border)", borderRadius: "6px",
              background: "transparent",
              color: testing ? "var(--accent3)" : "var(--cyan)",
              fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "13px",
              letterSpacing: "0.08em", cursor: testing ? "not-allowed" : "pointer",
            }}>
              {testing ? "TESTING..." : "TEST CONNECTION"}
            </button>
            <button onClick={handleScan} disabled={scanning} className="neon-btn" style={{
              flex: 2, padding: "10px",
              background: scanning ? "transparent" : "var(--cyan)",
              color: scanning ? "var(--accent3)" : "#0e0c09",
              border: scanning ? "1px solid var(--border)" : "none",
              borderRadius: "6px",
              fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "13px",
              letterSpacing: "0.1em", cursor: scanning ? "not-allowed" : "pointer",
            }}>
              {scanning ? "STARTING..." : "START SCAN →"}
            </button>
          </div>

          {/* ── Keep in Memory Toggle ── */}
          <div
            onClick={() => toggleMemory(!keepInMemory)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: "20px", padding: "10px 14px",
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "8px", cursor: "pointer", userSelect: "none",
            }}
          >
            <div>
              <div style={{
                color: "var(--accent2)", fontSize: "12px",
                fontFamily: "var(--font-ui)", fontWeight: 600,
              }}>
                Keep credentials in memory
              </div>
              <div style={{
                color: "var(--accent3)", fontSize: "11px",
                fontFamily: "var(--font-mono)", marginTop: "2px",
              }}>
                {keepInMemory ? "Fields stay filled when you navigate away" : "Cleared on page change"}
              </div>
            </div>

            {/* Pill toggle */}
            <div style={{
              width: "42px", height: "24px", borderRadius: "12px",
              background: keepInMemory ? "var(--cyan)" : "var(--border)",
              boxShadow: keepInMemory ? "var(--glow-cyan)" : "none",
              position: "relative", flexShrink: 0, marginLeft: "16px",
              transition: "background 0.2s",
            }}>
              <div style={{
                position: "absolute",
                top: "3px",
                left: keepInMemory ? "21px" : "3px",
                width: "18px", height: "18px", borderRadius: "50%",
                background: keepInMemory ? "var(--bg)" : "var(--accent3)",
                transition: "left 0.2s",
              }} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
