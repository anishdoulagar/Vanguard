import { useState, useEffect } from "react";
import AuthPage      from "./pages/AuthPage";
import SetupPage     from "./pages/SetupPage";
import DashboardPage from "./pages/DashboardPage";
import ConnectPage   from "./pages/ConnectPage";
import AccountsPage  from "./pages/AccountsPage";
import ScanPage      from "./pages/ScanPage";
import ResultsPage   from "./pages/ResultsPage";
import HistoryPage   from "./pages/HistoryPage";
import PoliciesPage  from "./pages/PoliciesPage";
import AlertsPage    from "./pages/AlertsPage";
import UsersPage     from "./pages/UsersPage";
import AuditPage     from "./pages/AuditPage";
import TeamsPage     from "./pages/TeamsPage";

const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IconAccounts = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const IconScan = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconHistory = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 8 12 12 14 14" />
    <path d="M3.05 11a9 9 0 1 0 .5-4" /><polyline points="3 3 3 7 7 7" />
  </svg>
);

const IconPolicies = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const NAV_ITEMS = [
  { id: "dashboard", label: "DASHBOARD",  Icon: IconDashboard },
  { id: "accounts",  label: "ACCOUNTS",   Icon: IconAccounts  },
  { id: "connect",   label: "QUICK SCAN", Icon: IconScan      },
  { id: "history",   label: "HISTORY",    Icon: IconHistory   },
  { id: "alerts",    label: "ALERTS",     Icon: IconBell      },
  { id: "policies",  label: "POLICIES",   Icon: IconPolicies  },
];

const IconAudit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconTeams = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

// Extra nav items only visible to admin+
const ADMIN_NAV_ITEMS = [
  { id: "teams", label: "TEAMS",     Icon: IconTeams,  minRole: "admin"      },
  { id: "users", label: "USERS",     Icon: IconUsers,  minRole: "superadmin" },
  { id: "audit", label: "AUDIT LOG", Icon: IconAudit,  minRole: "admin"      },
];

// ── Session persistence helpers ───────────────────────────────────────────────
function loadSession() {
  try {
    const t = sessionStorage.getItem("cspm_token");
    const u = sessionStorage.getItem("cspm_user");
    if (t && u) return { token: t, user: JSON.parse(u) };
  } catch {}
  return null;
}
function saveSession(token, user) {
  try {
    sessionStorage.setItem("cspm_token", token);
    sessionStorage.setItem("cspm_user", JSON.stringify(user));
  } catch {}
}
function clearSession() {
  try {
    sessionStorage.removeItem("cspm_token");
    sessionStorage.removeItem("cspm_user");
  } catch {}
}

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Read ?reset_token= or ?invite_token= from URL on initial load
function getResetTokenFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("reset_token") || null;
  } catch { return null; }
}
function getInviteTokenFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("invite_token") || null;
  } catch { return null; }
}

export default function App() {
  const saved = loadSession();
  const [token, setToken] = useState(saved?.token || null);
  const [user,  setUser]  = useState(saved?.user  || null);
  const [initialResetToken]  = useState(getResetTokenFromUrl);
  const [initialInviteToken] = useState(getInviteTokenFromUrl);

  // null = checking, true = needs setup, false = has users
  const [needsSetup, setNeedsSetup] = useState(null);

  useEffect(() => {
    fetch(`${API}/auth/setup-status`)
      .then(r => r.json())
      .then(d => setNeedsSetup(d.needs_setup === true))
      .catch(() => setNeedsSetup(false)); // if backend unreachable, fall through to normal auth
  }, []);

  const [theme, setTheme] = useState(() => localStorage.getItem("cspm_theme") || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cspm_theme", theme);
  }, [theme]);

  const [page,           setPage]           = useState("dashboard");
  const [scanResult,     setScanResult]     = useState(null);
  const [scanPayload,    setScanPayload]    = useState(null);
  const [dashboardData,  setDashboardData]  = useState(null);  // persists across navigation
  const [showSecurity,   setShowSecurity]   = useState(false);

  const [savedCloud, setSavedCloud] = useState("aws");
  const [savedAws,   setSavedAws]   = useState({
    access_key_id: "", secret_access_key: "", region: "us-east-1",
  });
  const [savedAzure, setSavedAzure] = useState({
    subscription_id: "", tenant_id: "", client_id: "", client_secret: "",
  });

  function handleAuth(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    saveSession(newToken, newUser);
    setPage("dashboard");
  }

  function handleLogout() {
    clearSession();
    setToken(null); setUser(null); setDashboardData(null);
    setPage("dashboard"); setScanResult(null); setScanPayload(null);
  }

  function goToScan(payload) {
    setSavedCloud(payload.cloud);
    if (payload.aws)   setSavedAws(payload.aws);
    if (payload.azure) setSavedAzure(payload.azure);
    setScanPayload(payload);
    setPage("scan");
  }

  function onScanComplete(result) {
    setScanResult(result);
    setPage("results");
  }

  // Still checking setup status — show minimal loading screen
  if (needsSetup === null) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", color: "var(--cyan)",
      fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: "0.1em",
      fontWeight: 600,
    }}>
      Initializing Vanguard...
    </div>
  );

  // First run — no users exist
  if (needsSetup) return (
    <SetupPage onSetupComplete={(t, u) => { setNeedsSetup(false); handleAuth(t, u); }} />
  );

  // Not logged in
  if (!token || !user) return (
    <AuthPage onAuth={handleAuth} initialResetToken={initialResetToken} initialInviteToken={initialInviteToken} />
  );

  const ROLE_RANK = { viewer: 0, analyst: 1, admin: 2, superadmin: 3 };
  function hasRole(min) {
    return (ROLE_RANK[user.role] ?? 0) >= (ROLE_RANK[min] ?? 0);
  }
  function Denied() {
    return (
      <div style={{ padding: "60px 32px", textAlign: "center",
                    color: "var(--accent3)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⛔</div>
        You don't have permission to view this page.
      </div>
    );
  }

  function renderPage() {
    switch (page) {
      case "accounts":
        return <AccountsPage token={token} role={user.role} user={user} onScanComplete={onScanComplete} />;
      case "teams":
        if (!hasRole("admin")) return <Denied />;
        return <TeamsPage token={token} user={user} />;
      case "connect":
        if (!hasRole("analyst")) return <Denied />;
        return (
          <ConnectPage
            onStartScan={goToScan}
            savedCloud={savedCloud}
            savedAws={savedAws}
            savedAzure={savedAzure}
            onCredsChange={(cloud, aws, azure) => {
              setSavedCloud(cloud);
              if (aws)   setSavedAws(aws);
              if (azure) setSavedAzure(azure);
            }}
          />
        );
      case "scan":
        if (!hasRole("analyst")) return <Denied />;
        return <ScanPage cloud={scanPayload} onComplete={onScanComplete} />;
      case "results":
        if (!hasRole("analyst")) return <Denied />;
        return (
          <ResultsPage
            result={scanResult}
            onNewScan={() => setPage("dashboard")}
          />
        );
      case "history":
        return <HistoryPage token={token} role={user.role} />;
      case "alerts":
        if (!hasRole("analyst")) return <Denied />;
        return <AlertsPage token={token} role={user.role} userEmail={user.email} />;
      case "policies":
        return <PoliciesPage role={user.role} />;
      case "users":
        if (!hasRole("superadmin")) return <Denied />;
        return <UsersPage token={token} currentUser={user} />;
      case "audit":
        if (!hasRole("admin")) return <Denied />;
        return <AuditPage token={token} role={user.role} />;
      default:
        return null;
    }
  }

  const activePage = ["results", "scan"].includes(page) ? "dashboard" : page;

  // ── SecurityModal — MFA setup/disable ──────────────────────────────────────
  function SecurityModal() {
    const [mfaStep,       setMfaStep]       = useState("idle"); // idle | setup | verify_setup | backup_codes | disable
    const [qrCode,        setQrCode]        = useState(null);
    const [secret,        setSecret]        = useState(null);
    const [verifyCode,    setVerifyCode]     = useState("");
    const [backupCodes,   setBackupCodes]   = useState([]);
    const [disableCode,   setDisableCode]   = useState("");
    const [loading,       setModalLoading]  = useState(false);
    const [err,           setErr]           = useState(null);
    const isMfaEnabled = user?.mfa_enabled;
    const hdrs = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    async function startSetup() {
      setModalLoading(true); setErr(null);
      try {
        const res  = await fetch(`${API}/auth/mfa/setup`, { method: "POST", headers: hdrs });
        const data = await res.json();
        if (!res.ok) { setErr(data.detail || "Setup failed."); return; }
        setQrCode(data.qr_code); setSecret(data.secret);
        setMfaStep("setup");
      } catch { setErr("Cannot reach server."); }
      finally { setModalLoading(false); }
    }

    async function confirmSetup() {
      if (!verifyCode.trim()) { setErr("Enter the 6-digit code."); return; }
      setModalLoading(true); setErr(null);
      try {
        const res  = await fetch(`${API}/auth/mfa/verify-setup`, {
          method: "POST", headers: hdrs,
          body: JSON.stringify({ code: verifyCode.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { setErr(data.detail || "Verification failed."); return; }
        setBackupCodes(data.backup_codes);
        setMfaStep("backup_codes");
        setUser(u => ({ ...u, mfa_enabled: true }));
        saveSession(token, { ...user, mfa_enabled: true });
      } catch { setErr("Cannot reach server."); }
      finally { setModalLoading(false); }
    }

    async function confirmDisable() {
      if (!disableCode.trim()) { setErr("Enter your authenticator code."); return; }
      setModalLoading(true); setErr(null);
      try {
        const res  = await fetch(`${API}/auth/mfa/disable`, {
          method: "POST", headers: hdrs,
          body: JSON.stringify({ code: disableCode.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { setErr(data.detail || "Could not disable MFA."); return; }
        setUser(u => ({ ...u, mfa_enabled: false }));
        saveSession(token, { ...user, mfa_enabled: false });
        setShowSecurity(false);
      } catch { setErr("Cannot reach server."); }
      finally { setModalLoading(false); }
    }

    const inputS = {
      width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 6, padding: "9px 12px", color: "var(--accent)",
      fontFamily: "var(--font-mono)", fontSize: 13, boxSizing: "border-box",
    };
    const btnPrimary = {
      width: "100%", padding: "10px", background: "var(--cyan)", color: "#0e0c09",
      border: "none", borderRadius: 6, fontFamily: "var(--font-ui)", fontWeight: 700,
      fontSize: 13, cursor: "pointer", letterSpacing: "0.04em", marginTop: 4,
    };
    const btnGhost = {
      width: "100%", padding: "10px", background: "transparent", color: "var(--accent3)",
      border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-ui)",
      fontWeight: 600, fontSize: 12, cursor: "pointer", letterSpacing: "0.04em", marginTop: 8,
    };

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.65)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20,
      }} onClick={() => setShowSecurity(false)}>
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 12, width: "100%", maxWidth: 420,
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em" }}>
              ACCOUNT SECURITY
            </div>
            <button onClick={() => setShowSecurity(false)} style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--accent3)", fontSize: 18, lineHeight: 1,
            }}>✕</button>
          </div>

          <div style={{ padding: 20 }}>
            {err && (
              <div style={{
                padding: "10px 14px", borderRadius: 6, marginBottom: 14,
                background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.25)",
                color: "#e05555", fontFamily: "var(--font-mono)", fontSize: 12,
              }}>{err}</div>
            )}

            {/* ── Idle / status ── */}
            {mfaStep === "idle" && (
              <>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 8, marginBottom: 16,
                  background: isMfaEnabled ? "rgba(76,175,125,0.07)" : "rgba(136,153,170,0.06)",
                  border: `1px solid ${isMfaEnabled ? "rgba(76,175,125,0.25)" : "var(--border)"}`,
                }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--accent)", marginBottom: 3 }}>
                      Two-Factor Authentication
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: isMfaEnabled ? "var(--green)" : "var(--accent3)" }}>
                      {isMfaEnabled ? "● Enabled" : "○ Not enabled"}
                    </div>
                  </div>
                  <div style={{
                    padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                    fontFamily: "var(--font-ui)", letterSpacing: "0.08em",
                    background: isMfaEnabled ? "rgba(76,175,125,0.12)" : "rgba(136,153,170,0.1)",
                    border: `1px solid ${isMfaEnabled ? "rgba(76,175,125,0.3)" : "var(--border)"}`,
                    color: isMfaEnabled ? "var(--green)" : "var(--accent3)",
                  }}>{isMfaEnabled ? "ACTIVE" : "INACTIVE"}</div>
                </div>
                {isMfaEnabled ? (
                  <button onClick={() => { setMfaStep("disable"); setErr(null); }} style={{
                    ...btnGhost, color: "#e05555", borderColor: "rgba(224,85,85,0.3)",
                  }}>Disable MFA</button>
                ) : (
                  <button onClick={startSetup} disabled={loading} style={btnPrimary}>
                    {loading ? "Loading..." : "Enable MFA"}
                  </button>
                )}
              </>
            )}

            {/* ── QR setup ── */}
            {mfaStep === "setup" && (
              <>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--accent2)", marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below.
                </p>
                {qrCode && (
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <img src={`data:image/png;base64,${qrCode}`} alt="MFA QR Code"
                         style={{ width: 180, height: 180, borderRadius: 8, border: "3px solid var(--border)" }} />
                  </div>
                )}
                <details style={{ marginBottom: 16 }}>
                  <summary style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--accent3)", cursor: "pointer", letterSpacing: "0.06em" }}>
                    Can't scan? Enter manually
                  </summary>
                  <div style={{
                    marginTop: 8, padding: "8px 10px", borderRadius: 6,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)",
                    wordBreak: "break-all", letterSpacing: "0.1em",
                  }}>{secret}</div>
                </details>
                <label style={{ display: "block", color: "var(--accent3)", fontSize: 11, letterSpacing: "0.1em", fontFamily: "var(--font-ui)", fontWeight: 600, marginBottom: 6 }}>
                  VERIFICATION CODE
                </label>
                <input
                  autoFocus type="text" inputMode="numeric" placeholder="000000" maxLength={6}
                  value={verifyCode} onChange={e => setVerifyCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && confirmSetup()}
                  style={{ ...inputS, textAlign: "center", fontSize: 20, letterSpacing: "0.3em" }}
                />
                <button onClick={confirmSetup} disabled={loading} style={{ ...btnPrimary, marginTop: 12 }}>
                  {loading ? "Verifying..." : "Activate MFA"}
                </button>
                <button onClick={() => setMfaStep("idle")} style={btnGhost}>Cancel</button>
              </>
            )}

            {/* ── Backup codes ── */}
            {mfaStep === "backup_codes" && (
              <>
                <div style={{
                  padding: "10px 14px", borderRadius: 6, marginBottom: 14,
                  background: "rgba(76,175,125,0.07)", border: "1px solid rgba(76,175,125,0.25)",
                  color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: 11,
                }}>
                  ✓ MFA enabled. Save these backup codes — they won't be shown again.
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16,
                }}>
                  {backupCodes.map((c, i) => (
                    <div key={i} style={{
                      padding: "7px 10px", borderRadius: 5, textAlign: "center",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                      color: "var(--accent)", letterSpacing: "0.15em",
                    }}>{c}</div>
                  ))}
                </div>
                <button onClick={() => setShowSecurity(false)} style={btnPrimary}>
                  I've saved my backup codes
                </button>
              </>
            )}

            {/* ── Disable ── */}
            {mfaStep === "disable" && (
              <>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--accent2)", marginTop: 0, marginBottom: 14, lineHeight: 1.6 }}>
                  Enter your current authenticator code or a backup code to disable MFA.
                </p>
                <label style={{ display: "block", color: "var(--accent3)", fontSize: 11, letterSpacing: "0.1em", fontFamily: "var(--font-ui)", fontWeight: 600, marginBottom: 6 }}>
                  VERIFICATION CODE
                </label>
                <input
                  autoFocus type="text" inputMode="numeric" placeholder="000000" maxLength={8}
                  value={disableCode} onChange={e => setDisableCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && confirmDisable()}
                  style={{ ...inputS, textAlign: "center", fontSize: 20, letterSpacing: "0.3em" }}
                />
                <button onClick={confirmDisable} disabled={loading} style={{
                  ...btnPrimary, background: "#e05555", marginTop: 12,
                }}>
                  {loading ? "Disabling..." : "Disable MFA"}
                </button>
                <button onClick={() => setMfaStep("idle")} style={btnGhost}>Cancel</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)" }}>
      {showSecurity && <SecurityModal />}

      {/* ── Sidebar ── */}
      <nav style={{
        width:"216px", flexShrink:0,
        background:"var(--surface)", borderRight:"1px solid var(--sidebar-border)",
        display:"flex", flexDirection:"column",
        padding:"20px 0", position:"sticky", top:0, height:"100vh",
      }}>
        <div style={{ padding:"0 18px 18px" }}>
          <div style={{
            fontFamily:"var(--font-display)", fontWeight:800,
            fontSize:"15px", letterSpacing:"0.10em", lineHeight:1,
            color:"var(--cyan)",
          }}>VANGUARD</div>
          <div style={{
            fontFamily:"var(--font-mono)", fontSize:"9px",
            color:"var(--accent3)", marginTop:"5px",
            letterSpacing:"0.12em",
          }}>CSPM Platform</div>
        </div>

        <div style={{ height:"1px", background:"var(--nav-divider)", marginBottom:"6px" }} />

        {NAV_ITEMS.filter(item =>
          !(user.role === "viewer" && item.id === "connect")
        ).map(({ id, label, Icon }) => {
          const active = activePage === id;
          return (
            <button key={id} onClick={() => setPage(id)}
              className={`nav-btn${active ? " active" : ""}`}
              style={{
                display:"flex", alignItems:"center", gap:"9px",
                padding:"8px 18px", border:"none",
                background: active ? "var(--nav-active-bg)" : "transparent",
                color:      active ? "var(--cyan)" : "var(--accent2)",
                fontFamily:"var(--font-ui)", fontWeight: active ? 600 : 400,
                fontSize:"11px", letterSpacing:"0.06em",
                cursor:"pointer", textAlign:"left", width:"100%",
                borderLeft: "none",
              }}>
              <Icon />{label}
            </button>
          );
        })}

        {/* Admin section */}
        {(user.role === "superadmin" || user.role === "admin") && (
          <>
            <div style={{
              margin:"12px 20px 4px",
              display:"flex", alignItems:"center", gap:6,
            }}>
              <div style={{ flex:1, height:"1px", background:"var(--nav-divider)" }} />
              <span style={{
                fontFamily:"var(--font-ui)", fontSize:"9px", fontWeight:700,
                color:"var(--magenta)", letterSpacing:"0.12em",
              }}>ADMIN</span>
              <div style={{ flex:1, height:"1px", background:"var(--nav-divider)" }} />
            </div>
            {ADMIN_NAV_ITEMS.filter(item =>
              item.minRole === "admin" || user.role === "superadmin"
            ).map(({ id, label, Icon }) => {
              const active = activePage === id;
              return (
                <button key={id} onClick={() => setPage(id)} style={{
                  display:"flex", alignItems:"center", gap:"9px",
                  padding:"8px 18px", border:"none",
                  background: active ? "var(--admin-active-bg)" : "transparent",
                  color:      active ? "var(--magenta)" : "var(--accent2)",
                  fontFamily:"var(--font-ui)", fontWeight: active ? 600 : 400,
                  fontSize:"11px", letterSpacing:"0.06em",
                  cursor:"pointer", textAlign:"left", width:"100%",
                  borderLeft: "none",
                  transition:"background 0.15s, color 0.15s",
                }}>
                  <Icon />{label}
                </button>
              );
            })}
          </>
        )}

        {/* User + Logout */}
        <div style={{ marginTop:"auto" }}>
          <div style={{ height:"1px", background:"var(--nav-divider)", marginBottom:"12px" }} />
          <div style={{ padding:"0 20px 8px" }}>
            <div style={{ color:"var(--accent)", fontSize:"12px",
                          fontFamily:"var(--font-ui)", fontWeight:600,
                          overflow:"hidden", textOverflow:"ellipsis",
                          whiteSpace:"nowrap" }}>{user.name}</div>
            <div style={{ color:"var(--accent3)", fontSize:"11px",
                          fontFamily:"var(--font-mono)", marginTop:"2px",
                          overflow:"hidden", textOverflow:"ellipsis",
                          whiteSpace:"nowrap" }}>{user.email}</div>
            {user.role && (() => {
              const roleColors = {
                viewer:     { bg:"rgba(16,185,129,0.10)", border:"rgba(16,185,129,0.3)", text:"var(--green)" },
                analyst:    { bg:"rgba(79,143,247,0.10)", border:"rgba(79,143,247,0.3)", text:"var(--blue)" },
                admin:      { bg:"var(--role-admin-bg)",  border:"var(--role-admin-border)", text:"var(--cyan)" },
                superadmin: { bg:"var(--role-super-bg)",  border:"var(--role-super-border)", text:"var(--magenta)" },
              };
              const c = roleColors[user.role] || roleColors.analyst;
              return (
                <div style={{ marginTop:"4px", display:"inline-block",
                  background:c.bg, border:`1px solid ${c.border}`,
                  color:c.text, fontSize:"9px", fontWeight:700,
                  padding:"1px 6px", borderRadius:"3px",
                  fontFamily:"var(--font-ui)", letterSpacing:"0.08em",
                  textTransform:"uppercase" }}>
                  {user.role}
                </div>
              );
            })()}
          </div>
          <button onClick={() => setShowSecurity(true)} style={{
            width:"100%", padding:"10px 20px",
            background:"transparent",
            border:"none", borderTop:"1px solid var(--bottom-divider)",
            color: user?.mfa_enabled ? "var(--green)" : "var(--accent3)",
            cursor:"pointer", fontFamily:"var(--font-ui)", fontSize:"12px",
            textAlign:"left", letterSpacing:"0.08em", transition:"color 0.15s",
            display:"flex", alignItems:"center", gap:8,
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
          onMouseLeave={e => e.currentTarget.style.color = user?.mfa_enabled ? "var(--green)" : "var(--accent3)"}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="11" width="14" height="10" rx="2"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            </svg>
            {user?.mfa_enabled ? "MFA ON" : "SECURITY"}
          </button>
          <button
            onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width:"100%", padding:"10px 20px",
              background:"transparent",
              border:"none", borderTop:"1px solid var(--bottom-divider)",
              color:"var(--accent3)", cursor:"pointer",
              fontFamily:"var(--font-ui)", fontSize:"12px",
              textAlign:"left", letterSpacing:"0.08em", transition:"color 0.15s",
              display:"flex", alignItems:"center", gap:8,
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--accent3)"}>
            {theme === "dark" ? "☀" : "☾"} {theme === "dark" ? "LIGHT MODE" : "DARK MODE"}
          </button>
          <button onClick={handleLogout} className="neon-btn" style={{
            width:"100%", padding:"10px 20px",
            background:"transparent",
            border:"none", borderTop:"1px solid var(--bottom-divider)",
            color:"var(--accent3)", cursor:"pointer",
            fontFamily:"var(--font-ui)", fontSize:"12px",
            textAlign:"left", letterSpacing:"0.08em", transition:"color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--accent3)"}>
            SIGN OUT
          </button>
        </div>
      </nav>

      <main style={{ flex:1, overflowY:"auto", minWidth:0, position:"relative" }}>
        {/* Dashboard is always mounted — never unmounts so it never loses state */}
        <div style={{ display: activePage === "dashboard" ? "block" : "none" }}>
          <DashboardPage
            token={token}
            role={user.role}
            onScanComplete={onScanComplete}
            onNavigate={setPage}
            isActive={activePage === "dashboard"}
          />
        </div>

        {/* All other pages render normally when active */}
        {activePage !== "dashboard" && renderPage()}
      </main>
    </div>
  );
}
