import { useEffect, useState, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STEPS_AWS = [
  "Authenticating with AWS STS...",
  "Scanning IAM users and password policy...",
  "Auditing S3 bucket configurations...",
  "Checking EC2 instances and IMDSv2...",
  "Reviewing Security Groups for open ports...",
  "Inspecting EBS volumes and snapshots...",
  "Checking VPC flow logs...",
  "Auditing CloudTrail configuration...",
  "Scanning RDS instances...",
  "Evaluating custom policy rules...",
  "Calculating risk scores...",
  "Generating report...",
];

const STEPS_AZURE = [
  "Authenticating with Azure via Service Principal...",
  "Scanning Storage Account configurations...",
  "Checking Virtual Machine disk encryption...",
  "Auditing Network Security Group rules...",
  "Inspecting Key Vault settings...",
  "Reviewing SQL Server security...",
  "Evaluating custom policy rules...",
  "Calculating risk scores...",
  "Generating report...",
];

const STEPS_ALL = [
  "Authenticating with AWS STS...",
  "Authenticating with Azure Service Principal...",
  "Scanning AWS IAM and S3...",
  "Scanning AWS EC2 and Security Groups...",
  "Scanning AWS CloudTrail and RDS...",
  "Scanning Azure Storage Accounts...",
  "Scanning Azure VMs and NSGs...",
  "Scanning Azure Key Vault and SQL...",
  "Running cross-cloud policy checks...",
  "Evaluating custom rules...",
  "Calculating risk scores...",
  "Generating unified report...",
];

export default function ScanPage({ cloud, onComplete }) {
  const [stepIndex,  setStepIndex]  = useState(0);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState(null);
  const [elapsed,    setElapsed]    = useState(0);
  const hasFired = useRef(false);

  const cloudType = cloud?.cloud || "aws";
  const steps = cloudType === "all" ? STEPS_ALL
              : cloudType === "azure" ? STEPS_AZURE
              : STEPS_AWS;

  // Step ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(i => Math.min(i + 1, steps.length - 2));
    }, 900);
    return () => clearInterval(interval);
  }, [steps.length]);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Actual API call
  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    async function runScan() {
      try {
        const res  = await fetch(`${API}/scan`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(cloud),
        });
        const data = await res.json();
        if (!res.ok) {
          const detail = data.detail;
          const msg = typeof detail === "string"
            ? detail
            : typeof detail === "object" && detail !== null
              ? Object.values(detail).join(" | ")
              : "Scan failed. Please check your credentials and try again.";
          setError(msg);
          return;
        }
        setStepIndex(steps.length - 1);
        setDone(true);
        setTimeout(() => onComplete(data), 800);
      } catch (e) {
        setError("Cannot reach API. Make sure the backend is running on port 8000.");
      }
    }

    runScan();
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "40px",
    }}>
      <div style={{
        width: "100%", maxWidth: "540px",
        animation: "fadeIn 0.3s ease",
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          {!error && !done && (
            <div style={{
              width: "48px", height: "48px",
              border: "2px solid var(--border)",
              borderTop: "2px solid var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 20px",
            }} />
          )}
          {done && (
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              background: "rgba(76,175,125,0.15)", border: "1px solid var(--green)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: "22px",
            }}>✓</div>
          )}
          {error && (
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              background: "rgba(224,85,85,0.15)", border: "1px solid var(--red)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: "22px",
            }}>✗</div>
          )}

          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700,
            color: "var(--accent)", letterSpacing: "0.05em",
          }}>
            {error ? "SCAN FAILED" : done ? "SCAN COMPLETE" : "SCANNING..."}
          </h2>
          <p style={{
            color: "var(--accent3)", fontSize: "12px",
            marginTop: "6px", fontFamily: "var(--font-mono)",
          }}>
            {error ? "" : `${cloudType.toUpperCase()} · ${elapsed}s elapsed`}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(224,85,85,0.1)", border: "1px solid rgba(224,85,85,0.3)",
            borderRadius: "8px", padding: "16px 20px", color: "var(--red)",
            fontFamily: "var(--font-mono)", fontSize: "13px", textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {/* Steps */}
        {!error && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "10px", padding: "20px 24px",
          }}>
            {steps.map((step, i) => {
              const isActive  = i === stepIndex && !done;
              const isDone    = i < stepIndex || done;
              const isPending = i > stepIndex && !done;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "7px 0",
                  opacity: isPending ? 0.3 : 1,
                  transition: "opacity 0.3s",
                }}>
                  {/* Dot */}
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                    background: isDone    ? "var(--green)"
                              : isActive  ? "var(--accent)"
                              : "var(--border)",
                    animation: isActive ? "pulse 1s ease infinite" : "none",
                    boxShadow: isActive ? "0 0 6px var(--accent)" : "none",
                  }} />
                  {/* Text */}
                  <span style={{
                    fontFamily:   "var(--font-mono)",
                    fontSize:     "12px",
                    color:        isDone   ? "var(--green)"
                                : isActive ? "var(--accent)"
                                : "var(--accent3)",
                  }}>
                    {step}
                  </span>
                  {/* Check */}
                  {isDone && (
                    <span style={{
                      marginLeft: "auto", color: "var(--green)",
                      fontSize: "12px", flexShrink: 0,
                    }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
