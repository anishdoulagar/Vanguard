"""
Azure Security Policy Rules — 145+ checks
Mapped to: CIS-Azure, NIST 800-53, PCI DSS, HIPAA, SOC2, ISO 27001, GDPR
"""

from translator.normalizer import Finding
from policies.custom_rules import evaluate_custom_rules

AZURE_RULES = [

    # ━━━ STORAGE ACCOUNTS (10) ━━━
    {
        "rule_id":     "AZ-ST-001",
        "severity":    "CRITICAL",
        "service":     "Storage Accounts",
        "title":       "Storage account allows public blob access",
        "message":     "Storage account permits anonymous public read access to blob containers.",
        "remediation": "Disable public blob access: Storage account → Configuration → Allow Blob public access → Disabled.",
        "frameworks":  ["CIS-Azure-3.5", "NIST-SC-7", "PCI-1.3", "GDPR-Art32", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AZ-ST-002",
        "severity":    "HIGH",
        "service":     "Storage Accounts",
        "title":       "Storage account does not enforce HTTPS",
        "message":     "HTTPS-only traffic is not enforced, allowing unencrypted HTTP connections.",
        "remediation": "Enable HTTPS only: Storage account → Configuration → Secure transfer required → Enabled.",
        "frameworks":  ["CIS-Azure-3.1", "NIST-SC-8", "PCI-4.1", "SOC2-CC6.7"],
    },
    {
        "rule_id":     "AZ-ST-003",
        "severity":    "HIGH",
        "service":     "Storage Accounts",
        "title":       "Storage account encryption not configured with CMK",
        "message":     "Storage account is not using Customer Managed Keys for encryption.",
        "remediation": "Configure CMK encryption: Storage account → Encryption → Customer-managed keys.",
        "frameworks":  ["CIS-Azure-3.2", "NIST-SC-28", "HIPAA-164.312", "ISO27001-A.10.1", "SOC2-CC6.7"],
    },
    {
        "rule_id":     "AZ-ST-004",
        "severity":    "MEDIUM",
        "service":     "Storage Accounts",
        "title":       "Storage account TLS version below 1.2",
        "message":     "Minimum TLS version is set below 1.2, allowing weak cipher connections.",
        "remediation": "Set minimum TLS: Storage account → Configuration → Minimum TLS version → TLS 1.2.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1", "CIS-Azure-3.7"],
    },
    {
        "rule_id":     "AZ-ST-005",
        "severity":    "MEDIUM",
        "service":     "Storage Accounts",
        "title":       "Storage account activity logging disabled",
        "message":     "Diagnostic logging is not enabled for this storage account.",
        "remediation": "Enable diagnostics: Storage account → Monitoring → Diagnostic settings → Add diagnostic setting.",
        "frameworks":  ["CIS-Azure-3.3", "NIST-AU-2", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-ST-006",
        "severity":    "MEDIUM",
        "service":     "Storage Accounts",
        "title":       "Storage account allows shared key authorization",
        "message":     "Shared key access is enabled, allowing any holder of the storage key to access data.",
        "remediation": "Disable shared key access and use Azure AD authorization instead.",
        "frameworks":  ["NIST-AC-3", "CIS-Azure-3.15", "ISO27001-A.9.4"],
    },
    {
        "rule_id":     "AZ-ST-007",
        "severity":    "LOW",
        "service":     "Storage Accounts",
        "title":       "Storage account has no geo-redundancy configured",
        "message":     "Storage account does not use geo-redundant storage (GRS or GZRS).",
        "remediation": "Update redundancy to GRS or GZRS: Storage account → Configuration → Replication.",
        "frameworks":  ["NIST-CP-9", "ISO27001-A.17.2", "SOC2-A1.2"],
    },
    {
        "rule_id":     "AZ-ST-008",
        "severity":    "MEDIUM",
        "service":     "Storage Accounts",
        "title":       "Storage account soft delete for blobs not enabled",
        "message":     "Blob soft delete is not enabled. Deleted blobs cannot be recovered within a retention window.",
        "remediation": "Enable blob soft delete: Storage account → Data protection → Enable soft delete for blobs.",
        "frameworks":  ["CIS-Azure-3.8", "NIST-CP-9", "ISO27001-A.12.3", "SOC2-A1.2"],
    },
    {
        "rule_id":     "AZ-ST-009",
        "severity":    "MEDIUM",
        "service":     "Storage Accounts",
        "title":       "Storage account soft delete for containers not enabled",
        "message":     "Container soft delete is not enabled. Deleted containers and their blobs cannot be recovered.",
        "remediation": "Enable container soft delete: Storage account → Data protection → Enable soft delete for containers.",
        "frameworks":  ["CIS-Azure-3.9", "NIST-CP-9", "ISO27001-A.12.3"],
    },
    {
        "rule_id":     "AZ-ST-010",
        "severity":    "LOW",
        "service":     "Storage Accounts",
        "title":       "Storage account used for boot diagnostics lacks encryption",
        "message":     "The storage account used for VM boot diagnostics does not enforce CMK encryption.",
        "remediation": "Use a CMK-encrypted storage account for boot diagnostics or use managed storage.",
        "frameworks":  ["NIST-SC-28", "HIPAA-164.312", "CIS-Azure-7.4"],
    },

    # ━━━ VIRTUAL MACHINES (12) ━━━
    {
        "rule_id":     "AZ-VM-001",
        "severity":    "HIGH",
        "service":     "Virtual Machines",
        "title":       "VM OS disk not encrypted with Azure Disk Encryption",
        "message":     "Virtual machine OS disk is not encrypted using Azure Disk Encryption.",
        "remediation": "Enable ADE: VM → Disks → Disk encryption → Select key vault → Save.",
        "frameworks":  ["CIS-Azure-7.2", "HIPAA-164.312", "NIST-SC-28", "PCI-3.4", "SOC2-CC6.7"],
    },
    {
        "rule_id":     "AZ-VM-002",
        "severity":    "HIGH",
        "service":     "Virtual Machines",
        "title":       "VM data disk not encrypted",
        "message":     "One or more VM data disks are not encrypted at rest.",
        "remediation": "Enable Azure Disk Encryption on all attached data disks.",
        "frameworks":  ["CIS-Azure-7.3", "HIPAA-164.312", "NIST-SC-28", "PCI-3.4"],
    },
    {
        "rule_id":     "AZ-VM-003",
        "severity":    "MEDIUM",
        "service":     "Virtual Machines",
        "title":       "Endpoint protection not installed on VM",
        "message":     "Microsoft Defender for Endpoint or equivalent is not installed on this VM.",
        "remediation": "Install endpoint protection via Microsoft Defender for Cloud recommendations.",
        "frameworks":  ["NIST-SI-3", "SOC2-CC7.1", "CIS-Azure-7.6"],
    },
    {
        "rule_id":     "AZ-VM-004",
        "severity":    "MEDIUM",
        "service":     "Virtual Machines",
        "title":       "VM OS updates not automatically applied",
        "message":     "Automatic OS patching is not enabled for this virtual machine.",
        "remediation": "Enable automatic OS upgrades or configure Azure Update Manager.",
        "frameworks":  ["NIST-SI-2", "CIS-Azure-7.1", "SOC2-CC7.7"],
    },
    {
        "rule_id":     "AZ-VM-005",
        "severity":    "MEDIUM",
        "service":     "Virtual Machines",
        "title":       "VM boot diagnostics not enabled",
        "message":     "Boot diagnostics is disabled. Unable to investigate boot failures or compromises.",
        "remediation": "Enable boot diagnostics: VM → Diagnostics → Boot diagnostics → Enable.",
        "frameworks":  ["NIST-AU-12", "CIS-Azure-7.4", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-VM-006",
        "severity":    "LOW",
        "service":     "Virtual Machines",
        "title":       "VM using unmanaged disk",
        "message":     "VM is using unmanaged disks. Managed disks offer better security and reliability.",
        "remediation": "Migrate VM disks to Azure Managed Disks.",
        "frameworks":  ["NIST-CP-9", "CIS-Azure-7.5"],
    },
    {
        "rule_id":     "AZ-VM-007",
        "severity":    "MEDIUM",
        "service":     "Virtual Machines",
        "title":       "VM has public IP without Network Security Group",
        "message":     "VM has a public IP address but no NSG is attached, leaving all ports exposed.",
        "remediation": "Attach an NSG with restrictive inbound rules to the VM's NIC or subnet.",
        "frameworks":  ["NIST-SC-7", "CIS-Azure-6.2", "PCI-1.2"],
    },
    {
        "rule_id":     "AZ-VM-008",
        "severity":    "HIGH",
        "service":     "Virtual Machines",
        "title":       "VM vulnerability assessment not enabled",
        "message":     "No vulnerability assessment solution is configured for this virtual machine.",
        "remediation": "Enable vulnerability assessment: Defender for Cloud → Recommendations → Enable vulnerability assessment on VMs.",
        "frameworks":  ["NIST-RA-5", "CIS-Azure-7.7", "SOC2-CC7.1", "PCI-6.3"],
    },
    {
        "rule_id":     "AZ-VM-009",
        "severity":    "HIGH",
        "service":     "Virtual Machines",
        "title":       "Just-in-time VM access not enabled",
        "message":     "Just-in-time (JIT) VM access is not configured, leaving management ports perpetually open.",
        "remediation": "Enable JIT access: Defender for Cloud → Workload protections → Just-in-time VM access.",
        "frameworks":  ["NIST-AC-17", "CIS-Azure-7.8", "SOC2-CC6.6", "PCI-2.2"],
    },
    {
        "rule_id":     "AZ-VM-010",
        "severity":    "MEDIUM",
        "service":     "Virtual Machines",
        "title":       "VM disk encryption set not using Customer Managed Key",
        "message":     "Disk Encryption Set is not configured with a Customer Managed Key in Azure Key Vault.",
        "remediation": "Configure disk encryption set with CMK: Disk Encryption Set → Key → Select CMK from Key Vault.",
        "frameworks":  ["NIST-SC-28", "HIPAA-164.312", "CIS-Azure-7.9", "ISO27001-A.10.1"],
    },
    {
        "rule_id":     "AZ-VM-011",
        "severity":    "MEDIUM",
        "service":     "Virtual Machines",
        "title":       "Network Watcher not enabled in VM region",
        "message":     "Azure Network Watcher is not provisioned in this region, preventing network diagnostics.",
        "remediation": "Enable Network Watcher: Network Watcher → Overview → Enable for the region.",
        "frameworks":  ["NIST-AU-12", "CIS-Azure-6.5", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-VM-012",
        "severity":    "MEDIUM",
        "service":     "Virtual Machines",
        "title":       "VM not protected by Azure Backup",
        "message":     "No Azure Backup policy is applied to this virtual machine.",
        "remediation": "Configure backup: Recovery Services vault → Backup → Azure Virtual Machine → select VM.",
        "frameworks":  ["NIST-CP-9", "ISO27001-A.12.3", "SOC2-A1.2", "HIPAA-164.308"],
    },

    # ━━━ NETWORK SECURITY GROUPS (6) ━━━
    {
        "rule_id":     "AZ-NSG-001",
        "severity":    "CRITICAL",
        "service":     "Network Security Groups",
        "title":       "NSG allows RDP (3389) inbound from internet",
        "message":     "NSG rule allows inbound RDP access on port 3389 from any source (0.0.0.0/0 or *).",
        "remediation": "Remove or restrict the RDP inbound rule. Use Azure Bastion or VPN for remote access.",
        "frameworks":  ["CIS-Azure-6.1", "PCI-1.2.1", "NIST-SC-7", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-NSG-002",
        "severity":    "CRITICAL",
        "service":     "Network Security Groups",
        "title":       "NSG allows SSH (22) inbound from internet",
        "message":     "NSG rule allows inbound SSH access on port 22 from any source.",
        "remediation": "Remove or restrict the SSH inbound rule. Use Azure Bastion or VPN for remote access.",
        "frameworks":  ["CIS-Azure-6.2", "PCI-1.2.1", "NIST-SC-7", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-NSG-003",
        "severity":    "HIGH",
        "service":     "Network Security Groups",
        "title":       "NSG allows all inbound traffic from internet",
        "message":     "NSG has a rule allowing all inbound traffic from any source.",
        "remediation": "Remove the allow-all inbound rule and configure specific required ports only.",
        "frameworks":  ["NIST-SC-7", "CIS-Azure-6.3", "PCI-1.2"],
    },
    {
        "rule_id":     "AZ-NSG-004",
        "severity":    "MEDIUM",
        "service":     "Network Security Groups",
        "title":       "NSG flow logs not enabled",
        "message":     "NSG flow logging is not enabled. Network traffic is not being recorded.",
        "remediation": "Enable flow logs: NSG → Monitoring → NSG flow logs → Enable.",
        "frameworks":  ["CIS-Azure-6.4", "NIST-AU-2", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-NSG-005",
        "severity":    "HIGH",
        "service":     "Network Security Groups",
        "title":       "NSG allows HTTP (80) inbound from internet",
        "message":     "NSG allows unencrypted HTTP traffic on port 80 from any source.",
        "remediation": "Block port 80 inbound or redirect HTTP to HTTPS at the application layer.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1", "CIS-Azure-6.3"],
    },
    {
        "rule_id":     "AZ-NSG-006",
        "severity":    "MEDIUM",
        "service":     "Network Security Groups",
        "title":       "No Azure DDoS Protection plan configured",
        "message":     "No DDoS Protection Standard plan is associated with this virtual network.",
        "remediation": "Enable DDoS Protection Standard on the virtual network.",
        "frameworks":  ["NIST-SC-5", "ISO27001-A.13.1", "CIS-Azure-6.7"],
    },

    # ━━━ KEY VAULT (9) ━━━
    {
        "rule_id":     "AZ-KV-001",
        "severity":    "MEDIUM",
        "service":     "Key Vault",
        "title":       "Key Vault soft delete not enabled",
        "message":     "Soft delete is not enabled. Deleted keys, secrets, and certificates are unrecoverable.",
        "remediation": "Enable soft delete: Key Vault → Properties → Soft delete → Enable.",
        "frameworks":  ["CIS-Azure-8.4", "NIST-CP-9", "ISO27001-A.12.3"],
    },
    {
        "rule_id":     "AZ-KV-002",
        "severity":    "MEDIUM",
        "service":     "Key Vault",
        "title":       "Key Vault purge protection not enabled",
        "message":     "Purge protection is disabled, allowing permanent deletion during soft-delete retention.",
        "remediation": "Enable purge protection: Key Vault → Properties → Purge protection → Enable.",
        "frameworks":  ["CIS-Azure-8.5", "NIST-CP-9", "ISO27001-A.12.3"],
    },
    {
        "rule_id":     "AZ-KV-003",
        "severity":    "HIGH",
        "service":     "Key Vault",
        "title":       "Key Vault public network access not restricted",
        "message":     "Key Vault allows access from all networks including the public internet.",
        "remediation": "Restrict access: Key Vault → Networking → Allow access from → Selected networks or Private endpoint.",
        "frameworks":  ["NIST-SC-7", "CIS-Azure-8.1", "PCI-1.3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-KV-004",
        "severity":    "MEDIUM",
        "service":     "Key Vault",
        "title":       "Key Vault key expiry not configured",
        "message":     "One or more Key Vault keys have no expiry date set.",
        "remediation": "Set an expiry date on all Key Vault keys.",
        "frameworks":  ["NIST-SC-12", "CIS-Azure-8.2", "ISO27001-A.10.1"],
    },
    {
        "rule_id":     "AZ-KV-005",
        "severity":    "MEDIUM",
        "service":     "Key Vault",
        "title":       "Key Vault secret expiry not configured",
        "message":     "One or more Key Vault secrets have no expiry date set.",
        "remediation": "Set an expiry date on all Key Vault secrets.",
        "frameworks":  ["NIST-SC-12", "CIS-Azure-8.3", "ISO27001-A.10.1"],
    },
    {
        "rule_id":     "AZ-KV-006",
        "severity":    "LOW",
        "service":     "Key Vault",
        "title":       "Key Vault diagnostic logging not enabled",
        "message":     "Diagnostic logging is not configured for this Key Vault.",
        "remediation": "Enable diagnostics: Key Vault → Monitoring → Diagnostic settings → Add setting.",
        "frameworks":  ["NIST-AU-2", "CIS-Azure-8.6", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-KV-007",
        "severity":    "HIGH",
        "service":     "Key Vault",
        "title":       "Key Vault firewall not enabled",
        "message":     "Key Vault does not have a firewall configured to restrict access to specific networks.",
        "remediation": "Enable Key Vault firewall: Key Vault → Networking → Firewalls and virtual networks → Allow selected networks.",
        "frameworks":  ["CIS-Azure-8.7", "NIST-SC-7", "PCI-1.3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-KV-008",
        "severity":    "HIGH",
        "service":     "Key Vault",
        "title":       "Key Vault has no private endpoint configured",
        "message":     "No private endpoint is configured for this Key Vault, exposing it to potential internet access.",
        "remediation": "Create a private endpoint: Key Vault → Networking → Private endpoint connections → Add.",
        "frameworks":  ["CIS-Azure-8.8", "NIST-SC-7", "PCI-1.3"],
    },
    {
        "rule_id":     "AZ-KV-009",
        "severity":    "MEDIUM",
        "service":     "Key Vault",
        "title":       "Key Vault RBAC authorization not enabled",
        "message":     "Key Vault is using legacy access policies instead of Azure RBAC for authorization.",
        "remediation": "Migrate to RBAC: Key Vault → Access configuration → Permission model → Azure role-based access control.",
        "frameworks":  ["CIS-Azure-8.9", "NIST-AC-3", "ISO27001-A.9.4"],
    },

    # ━━━ SQL DATABASE (10) ━━━
    {
        "rule_id":     "AZ-SQL-001",
        "severity":    "HIGH",
        "service":     "SQL Database",
        "title":       "SQL Database Transparent Data Encryption not enabled",
        "message":     "TDE is not enabled. Database files and backups are unencrypted at rest.",
        "remediation": "Enable TDE: SQL Database → Transparent data encryption → On.",
        "frameworks":  ["CIS-Azure-4.1", "HIPAA-164.312", "NIST-SC-28", "PCI-3.4", "SOC2-CC6.7"],
    },
    {
        "rule_id":     "AZ-SQL-002",
        "severity":    "MEDIUM",
        "service":     "SQL Database",
        "title":       "SQL Database auditing disabled",
        "message":     "Database auditing is not enabled. Query and access activity is not logged.",
        "remediation": "Enable auditing: SQL Server → Auditing → Enable → configure storage account.",
        "frameworks":  ["CIS-Azure-4.2", "NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-SQL-003",
        "severity":    "HIGH",
        "service":     "SQL Database",
        "title":       "SQL Server is publicly accessible",
        "message":     "SQL Server firewall allows public internet access.",
        "remediation": "Remove public firewall rules and use private endpoints or VNet service endpoints.",
        "frameworks":  ["CIS-Azure-4.3", "NIST-SC-7", "PCI-1.3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-SQL-004",
        "severity":    "MEDIUM",
        "service":     "SQL Database",
        "title":       "SQL Advanced Threat Protection disabled",
        "message":     "Advanced Threat Protection is not enabled for this SQL Server.",
        "remediation": "Enable ATP: SQL Server → Microsoft Defender for SQL → Enable.",
        "frameworks":  ["CIS-Azure-4.4", "NIST-SI-3", "SOC2-CC7.1"],
    },
    {
        "rule_id":     "AZ-SQL-005",
        "severity":    "MEDIUM",
        "service":     "SQL Database",
        "title":       "SQL audit log retention less than 90 days",
        "message":     "Audit log retention period is configured below 90 days.",
        "remediation": "Set retention to 90+ days in SQL Server auditing settings.",
        "frameworks":  ["CIS-Azure-4.5", "NIST-AU-11", "PCI-10.7", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-SQL-006",
        "severity":    "HIGH",
        "service":     "SQL Database",
        "title":       "SQL Server has no Azure AD admin configured",
        "message":     "No Azure Active Directory administrator is configured for this SQL Server.",
        "remediation": "Set AAD admin: SQL Server → Azure Active Directory admin → Set admin.",
        "frameworks":  ["CIS-Azure-4.6", "NIST-IA-2", "PCI-8.2", "ISO27001-A.9.2"],
    },
    {
        "rule_id":     "AZ-SQL-007",
        "severity":    "MEDIUM",
        "service":     "SQL Database",
        "title":       "SQL Database vulnerability assessment not configured",
        "message":     "Vulnerability assessment is not enabled for this SQL database.",
        "remediation": "Enable vulnerability assessment: SQL Server → Microsoft Defender for SQL → Vulnerability assessment.",
        "frameworks":  ["NIST-RA-5", "SOC2-CC7.1", "CIS-Azure-4.7"],
    },
    {
        "rule_id":     "AZ-SQL-008",
        "severity":    "HIGH",
        "service":     "SQL Database",
        "title":       "SQL Server firewall rule has overly broad IP range",
        "message":     "A SQL Server firewall rule covers an excessively broad IP range (e.g., 0.0.0.0–255.255.255.255).",
        "remediation": "Replace broad firewall rules with specific IP ranges or use Private Link.",
        "frameworks":  ["CIS-Azure-4.3", "NIST-SC-7", "PCI-1.2", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-SQL-009",
        "severity":    "HIGH",
        "service":     "SQL Database",
        "title":       "SQL Server Azure AD-only authentication not enforced",
        "message":     "SQL Server still allows SQL authentication in addition to Azure AD. Only AAD auth should be permitted.",
        "remediation": "Enable Azure AD-only authentication: SQL Server → Azure Active Directory → Support only Azure AD authentication.",
        "frameworks":  ["CIS-Azure-4.6", "NIST-IA-2", "ISO27001-A.9.4"],
    },
    {
        "rule_id":     "AZ-SQL-010",
        "severity":    "MEDIUM",
        "service":     "SQL Database",
        "title":       "SQL Database geo-redundant backup disabled",
        "message":     "Geo-redundant backup is not enabled for this SQL database, risking data loss in a regional outage.",
        "remediation": "Enable geo-redundant backup: SQL Database → Compute + storage → Backup redundancy → Geo-redundant.",
        "frameworks":  ["NIST-CP-9", "ISO27001-A.17.2", "SOC2-A1.2"],
    },

    # ━━━ ACTIVE DIRECTORY (6) ━━━
    {
        "rule_id":     "AZ-AD-001",
        "severity":    "CRITICAL",
        "service":     "Active Directory",
        "title":       "MFA not required for all Azure AD users",
        "message":     "Multi-factor authentication is not enforced for all user accounts.",
        "remediation": "Enable MFA via Conditional Access policy or enable Security Defaults in Azure AD.",
        "frameworks":  ["CIS-Azure-1.1", "NIST-IA-3", "PCI-8.4", "SOC2-CC6.1", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AZ-AD-002",
        "severity":    "HIGH",
        "service":     "Active Directory",
        "title":       "No Conditional Access policies configured",
        "message":     "No Conditional Access policies exist to enforce access controls.",
        "remediation": "Create at minimum a policy requiring MFA for all users or privileged users.",
        "frameworks":  ["CIS-Azure-1.2", "NIST-AC-2", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AZ-AD-003",
        "severity":    "MEDIUM",
        "service":     "Active Directory",
        "title":       "Guest user permissions not restricted",
        "message":     "Guest users have default permissions that may allow enumeration of AAD resources.",
        "remediation": "Restrict guest permissions: AAD → External Identities → External collaboration settings.",
        "frameworks":  ["CIS-Azure-1.3", "NIST-AC-6", "ISO27001-A.9.2"],
    },
    {
        "rule_id":     "AZ-AD-004",
        "severity":    "MEDIUM",
        "service":     "Active Directory",
        "title":       "Privileged Identity Management not used",
        "message":     "PIM is not configured for just-in-time privileged role activation.",
        "remediation": "Enable Azure AD PIM for privileged roles to enforce JIT access.",
        "frameworks":  ["NIST-AC-5", "CIS-Azure-1.14", "ISO27001-A.9.2", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AZ-AD-005",
        "severity":    "HIGH",
        "service":     "Active Directory",
        "title":       "Azure AD Security Defaults disabled",
        "message":     "Security Defaults are disabled and no Conditional Access policies replace them.",
        "remediation": "Enable Security Defaults or configure equivalent Conditional Access policies.",
        "frameworks":  ["CIS-Azure-1.22", "NIST-AC-2", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AZ-AD-006",
        "severity":    "MEDIUM",
        "service":     "Active Directory",
        "title":       "No access review configured for privileged roles",
        "message":     "Privileged role assignments are not periodically reviewed.",
        "remediation": "Configure access reviews in Azure AD Identity Governance for privileged roles.",
        "frameworks":  ["NIST-AC-2", "ISO27001-A.9.2", "SOC2-CC6.3"],
    },

    # ━━━ MONITOR / LOGGING (12) ━━━
    {
        "rule_id":     "AZ-MON-001",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "No diagnostic log profile for Activity Log",
        "message":     "Azure Activity Log is not configured with a diagnostic setting to retain logs.",
        "remediation": "Create diagnostic setting: Monitor → Activity log → Diagnostic settings → Add setting.",
        "frameworks":  ["CIS-Azure-5.1", "NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-MON-002",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "Activity log retention period less than 365 days",
        "message":     "Activity log data is retained for fewer than 365 days.",
        "remediation": "Set log retention to at least 365 days in the diagnostic settings.",
        "frameworks":  ["CIS-Azure-5.1", "NIST-AU-11", "PCI-10.7", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-MON-003",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "No alert for Azure Policy assignment changes",
        "message":     "No activity log alert is configured for policy assignment changes.",
        "remediation": "Create alert: Monitor → Alerts → Create → Activity log signal → Policy assignment writes.",
        "frameworks":  ["CIS-Azure-5.2", "NIST-AU-6", "SOC2-CC7.3"],
    },
    {
        "rule_id":     "AZ-MON-004",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "No alert for network security group changes",
        "message":     "No activity log alert is configured for NSG modifications.",
        "remediation": "Create alert for NSG write/delete operations in Azure Monitor.",
        "frameworks":  ["CIS-Azure-5.3", "NIST-AU-6", "SOC2-CC7.3"],
    },
    {
        "rule_id":     "AZ-MON-005",
        "severity":    "HIGH",
        "service":     "Monitor",
        "title":       "Microsoft Defender for Cloud not enabled",
        "message":     "Microsoft Defender for Cloud is not enabled or is on the free tier.",
        "remediation": "Enable Defender for Cloud Standard tier for all resource types.",
        "frameworks":  ["NIST-RA-5", "SOC2-CC7.1", "CIS-Azure-2.1"],
    },
    {
        "rule_id":     "AZ-MON-006",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "No alert for NSG rule changes",
        "message":     "No activity log alert is configured to detect changes to NSG security rules.",
        "remediation": "Create alert for SecurityRules write/delete events in Azure Monitor.",
        "frameworks":  ["CIS-Azure-5.3", "NIST-AU-6", "SOC2-CC7.3"],
    },
    {
        "rule_id":     "AZ-MON-007",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "No alert for subscription-level administrative changes",
        "message":     "No activity log alert is configured for subscription-level write or delete operations.",
        "remediation": "Create alert: Monitor → Alerts → Activity log → Administrative category → Write/Delete.",
        "frameworks":  ["CIS-Azure-5.4", "NIST-AU-6", "SOC2-CC7.3", "PCI-10.6"],
    },
    {
        "rule_id":     "AZ-MON-008",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "Diagnostic settings not configured for all resource types",
        "message":     "Some Azure resource types do not have diagnostic settings forwarding logs to a central workspace.",
        "remediation": "Configure diagnostic settings for all resource types to send logs to Log Analytics or Storage.",
        "frameworks":  ["NIST-AU-2", "CIS-Azure-5.1", "SOC2-CC7.2", "PCI-10.1"],
    },
    {
        "rule_id":     "AZ-MON-009",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "Log Analytics workspace retention below 90 days",
        "message":     "Log Analytics workspace data retention is configured below 90 days.",
        "remediation": "Increase retention: Log Analytics workspace → Usage and estimated costs → Data Retention → set 90+ days.",
        "frameworks":  ["CIS-Azure-5.1", "NIST-AU-11", "PCI-10.7", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-MON-010",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "No alert for Key Vault operations",
        "message":     "No activity log alert is configured to detect Key Vault access or modification events.",
        "remediation": "Create alert: Monitor → Alerts → Activity log → Key Vault operations.",
        "frameworks":  ["CIS-Azure-5.5", "NIST-AU-6", "SOC2-CC7.3", "PCI-10.6"],
    },
    {
        "rule_id":     "AZ-MON-011",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "No alert for SQL Server firewall changes",
        "message":     "No activity log alert is configured to detect SQL Server firewall rule modifications.",
        "remediation": "Create alert for Microsoft.Sql/servers/firewallRules write/delete in Azure Monitor.",
        "frameworks":  ["CIS-Azure-5.6", "NIST-AU-6", "SOC2-CC7.3"],
    },
    {
        "rule_id":     "AZ-MON-012",
        "severity":    "MEDIUM",
        "service":     "Monitor",
        "title":       "Audit log profile retention insufficient",
        "message":     "The audit log profile does not retain logs across all required categories and regions.",
        "remediation": "Update log profile to capture all regions and retain data for at least 1 year.",
        "frameworks":  ["CIS-Azure-5.1", "NIST-AU-11", "PCI-10.7"],
    },

    # ━━━ APP SERVICE (9) ━━━
    {
        "rule_id":     "AZ-APP-001",
        "severity":    "HIGH",
        "service":     "App Service",
        "title":       "App Service does not enforce HTTPS only",
        "message":     "App Service allows HTTP connections, exposing data in transit.",
        "remediation": "Enable HTTPS Only: App Service → TLS/SSL settings → HTTPS Only → On.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1", "CIS-Azure-9.1", "SOC2-CC6.7"],
    },
    {
        "rule_id":     "AZ-APP-002",
        "severity":    "HIGH",
        "service":     "App Service",
        "title":       "App Service minimum TLS version below 1.2",
        "message":     "App Service is configured to accept TLS versions below 1.2.",
        "remediation": "Set minimum TLS: App Service → TLS/SSL settings → Minimum TLS Version → 1.2.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1", "CIS-Azure-9.2", "SOC2-CC6.7"],
    },
    {
        "rule_id":     "AZ-APP-003",
        "severity":    "MEDIUM",
        "service":     "App Service",
        "title":       "App Service authentication not enabled",
        "message":     "App Service Easy Auth / built-in authentication is not configured.",
        "remediation": "Configure authentication: App Service → Authentication → Add identity provider.",
        "frameworks":  ["NIST-IA-2", "CIS-Azure-9.3"],
    },
    {
        "rule_id":     "AZ-APP-004",
        "severity":    "MEDIUM",
        "service":     "App Service",
        "title":       "App Service remote debugging enabled",
        "message":     "Remote debugging is enabled on this App Service, exposing a debug port.",
        "remediation": "Disable remote debugging: App Service → Configuration → General settings → Remote debugging → Off.",
        "frameworks":  ["NIST-CM-7", "CIS-Azure-9.4"],
    },
    {
        "rule_id":     "AZ-APP-005",
        "severity":    "LOW",
        "service":     "App Service",
        "title":       "App Service HTTP logging disabled",
        "message":     "HTTP logging is not enabled for this App Service.",
        "remediation": "Enable logging: App Service → App Service logs → Application Logging → Enable.",
        "frameworks":  ["NIST-AU-2", "CIS-Azure-9.5", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-APP-006",
        "severity":    "MEDIUM",
        "service":     "App Service",
        "title":       "App Service not using Managed Identity",
        "message":     "App Service is not configured with a managed identity for Azure service authentication.",
        "remediation": "Enable managed identity: App Service → Identity → System assigned → On.",
        "frameworks":  ["NIST-IA-5", "ISO27001-A.9.4", "CIS-Azure-9.6"],
    },
    {
        "rule_id":     "AZ-APP-007",
        "severity":    "MEDIUM",
        "service":     "App Service",
        "title":       "App Service FTP deployment not disabled",
        "message":     "FTP deployment is allowed on this App Service. FTP transmits credentials in cleartext.",
        "remediation": "Disable FTP: App Service → Configuration → General settings → FTP state → Disabled.",
        "frameworks":  ["CIS-Azure-9.7", "NIST-SC-8", "PCI-4.1", "SOC2-CC6.7"],
    },
    {
        "rule_id":     "AZ-APP-008",
        "severity":    "MEDIUM",
        "service":     "App Service",
        "title":       "App Service using outdated runtime version",
        "message":     "App Service is running an outdated language runtime (Python, PHP, Java, or .NET).",
        "remediation": "Update runtime: App Service → Configuration → General settings → select latest supported version.",
        "frameworks":  ["NIST-SI-2", "CIS-Azure-9.8", "SOC2-CC7.7"],
    },
    {
        "rule_id":     "AZ-APP-009",
        "severity":    "MEDIUM",
        "service":     "App Service",
        "title":       "App Service client certificate not required",
        "message":     "Incoming client certificates are not required, weakening mutual TLS authentication.",
        "remediation": "Enable client certificates: App Service → Configuration → General settings → Client certificate mode → Required.",
        "frameworks":  ["CIS-Azure-9.9", "NIST-IA-3", "PCI-8.2"],
    },

    # ━━━ AKS (8) ━━━
    {
        "rule_id":     "AZ-AKS-001",
        "severity":    "HIGH",
        "service":     "AKS",
        "title":       "AKS API server public access not restricted",
        "message":     "AKS cluster API server is accessible from any IP on the public internet.",
        "remediation": "Enable authorized IP ranges or private cluster: AKS → Networking → Set authorized IP ranges.",
        "frameworks":  ["NIST-SC-7", "CIS-Azure-5.4", "SOC2-CC6.6", "PCI-1.3"],
    },
    {
        "rule_id":     "AZ-AKS-002",
        "severity":    "HIGH",
        "service":     "AKS",
        "title":       "AKS cluster RBAC not enabled",
        "message":     "Kubernetes RBAC is not enabled on this AKS cluster.",
        "remediation": "Enable RBAC during cluster creation or recreate the cluster with RBAC enabled.",
        "frameworks":  ["NIST-AC-3", "CIS-Azure-5.1", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AZ-AKS-003",
        "severity":    "MEDIUM",
        "service":     "AKS",
        "title":       "AKS monitoring addon not enabled",
        "message":     "Container Insights monitoring is not enabled for this AKS cluster.",
        "remediation": "Enable monitoring addon: AKS → Insights → Enable.",
        "frameworks":  ["NIST-AU-12", "CIS-Azure-5.3", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-AKS-004",
        "severity":    "MEDIUM",
        "service":     "AKS",
        "title":       "AKS cluster running outdated Kubernetes version",
        "message":     "AKS cluster is not running the latest supported Kubernetes version.",
        "remediation": "Upgrade: AKS → Cluster → Kubernetes version → Upgrade.",
        "frameworks":  ["NIST-SI-2", "CIS-Azure-5.5", "SOC2-CC7.7"],
    },
    {
        "rule_id":     "AZ-AKS-005",
        "severity":    "MEDIUM",
        "service":     "AKS",
        "title":       "AKS cluster network policy not configured",
        "message":     "No Kubernetes network policy is configured for pod-to-pod traffic isolation.",
        "remediation": "Enable network policy (Azure or Calico) during cluster creation.",
        "frameworks":  ["NIST-SC-7", "CIS-Azure-5.2"],
    },
    {
        "rule_id":     "AZ-AKS-006",
        "severity":    "HIGH",
        "service":     "AKS",
        "title":       "AKS cluster not configured as private cluster",
        "message":     "AKS cluster API server is not deployed as a private cluster, exposing it to public internet.",
        "remediation": "Recreate the cluster with private cluster enabled, or restrict authorized IP ranges.",
        "frameworks":  ["CIS-Azure-5.6", "NIST-SC-7", "PCI-1.3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-AKS-007",
        "severity":    "MEDIUM",
        "service":     "AKS",
        "title":       "Azure Policy addon not enabled on AKS cluster",
        "message":     "The Azure Policy addon for Kubernetes is not enabled on this AKS cluster.",
        "remediation": "Enable Azure Policy addon: AKS → Policies → Enable Azure Policy.",
        "frameworks":  ["CIS-Azure-5.7", "NIST-CM-6", "SOC2-CC6.8"],
    },
    {
        "rule_id":     "AZ-AKS-008",
        "severity":    "MEDIUM",
        "service":     "AKS",
        "title":       "AKS node pool OS disk not encrypted with CMK",
        "message":     "Node pool OS disk encryption is not configured with a Customer Managed Key.",
        "remediation": "Configure disk encryption set: AKS → Node pools → OS disk encryption → apply DES with CMK.",
        "frameworks":  ["CIS-Azure-5.8", "NIST-SC-28", "HIPAA-164.312"],
    },

    # ━━━ CONTAINER REGISTRY (5) ━━━
    {
        "rule_id":     "AZ-ACR-001",
        "severity":    "HIGH",
        "service":     "Container Registry",
        "title":       "ACR admin user enabled",
        "message":     "Admin user is enabled on the container registry, allowing username/password access.",
        "remediation": "Disable admin user: ACR → Access keys → Admin user → Disabled. Use service principals.",
        "frameworks":  ["NIST-AC-6", "CIS-Azure-7.4", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AZ-ACR-002",
        "severity":    "HIGH",
        "service":     "Container Registry",
        "title":       "ACR public network access enabled",
        "message":     "Container registry allows public internet access.",
        "remediation": "Restrict network access: ACR → Networking → Disable public access. Use private endpoint.",
        "frameworks":  ["NIST-SC-7", "CIS-Azure-7.5", "PCI-1.3"],
    },
    {
        "rule_id":     "AZ-ACR-003",
        "severity":    "MEDIUM",
        "service":     "Container Registry",
        "title":       "ACR image vulnerability scanning disabled",
        "message":     "Microsoft Defender for Container Registries is not scanning images in this registry.",
        "remediation": "Enable Defender for Containers in Microsoft Defender for Cloud.",
        "frameworks":  ["NIST-RA-5", "SOC2-CC7.1", "CIS-Azure-7.6"],
    },
    {
        "rule_id":     "AZ-ACR-004",
        "severity":    "MEDIUM",
        "service":     "Container Registry",
        "title":       "ACR geo-replication not enabled",
        "message":     "Container registry does not have geo-replication configured for high availability.",
        "remediation": "Enable geo-replication: ACR → Geo-replication → Add replication to additional regions.",
        "frameworks":  ["NIST-CP-9", "ISO27001-A.17.2", "SOC2-A1.2"],
    },
    {
        "rule_id":     "AZ-ACR-005",
        "severity":    "LOW",
        "service":     "Container Registry",
        "title":       "ACR webhook not configured for image push events",
        "message":     "No webhook is configured on this container registry for image push notification or audit.",
        "remediation": "Configure webhook: ACR → Services → Webhooks → Add webhook for push events.",
        "frameworks":  ["NIST-AU-2", "SOC2-CC7.2"],
    },

    # ━━━ COSMOS DB (3) ━━━
    {
        "rule_id":     "AZ-CDB-001",
        "severity":    "HIGH",
        "service":     "Cosmos DB",
        "title":       "Cosmos DB account has public network access enabled",
        "message":     "Cosmos DB allows connections from all networks including the public internet.",
        "remediation": "Restrict access: Cosmos DB → Networking → Allow access from → Selected networks or Private endpoint.",
        "frameworks":  ["NIST-SC-7", "CIS-Azure-4.3", "PCI-1.3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-CDB-002",
        "severity":    "MEDIUM",
        "service":     "Cosmos DB",
        "title":       "Cosmos DB has no private endpoint configured",
        "message":     "No private endpoint is configured for this Cosmos DB account.",
        "remediation": "Create a private endpoint for the Cosmos DB account in your virtual network.",
        "frameworks":  ["NIST-SC-7", "CIS-Azure-4.4"],
    },
    {
        "rule_id":     "AZ-CDB-003",
        "severity":    "HIGH",
        "service":     "Cosmos DB",
        "title":       "Cosmos DB firewall rules are too permissive",
        "message":     "Cosmos DB firewall includes overly broad CIDR ranges.",
        "remediation": "Restrict firewall rules to specific required IP ranges only.",
        "frameworks":  ["NIST-SC-7", "CIS-Azure-4.3"],
    },

    # ━━━ REDIS CACHE (3) ━━━
    {
        "rule_id":     "AZ-RED-001",
        "severity":    "HIGH",
        "service":     "Redis Cache",
        "title":       "Redis Cache non-SSL port enabled",
        "message":     "Non-SSL port (6379) is enabled on Redis Cache, allowing unencrypted connections.",
        "remediation": "Disable non-SSL port: Redis Cache → Settings → Access ports → Non-SSL port → Disabled.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1", "CIS-Azure-6.1"],
    },
    {
        "rule_id":     "AZ-RED-002",
        "severity":    "HIGH",
        "service":     "Redis Cache",
        "title":       "Redis Cache allows public access",
        "message":     "Redis Cache is accessible from public IP addresses.",
        "remediation": "Restrict access using firewall rules or Virtual Network injection.",
        "frameworks":  ["NIST-SC-7", "CIS-Azure-6.2", "PCI-1.3"],
    },
    {
        "rule_id":     "AZ-RED-003",
        "severity":    "MEDIUM",
        "service":     "Redis Cache",
        "title":       "Redis Cache minimum TLS version below 1.2",
        "message":     "Redis Cache is configured to accept TLS versions below 1.2.",
        "remediation": "Set minimum TLS to 1.2: Redis Cache → Settings → Access ports → Minimum TLS version.",
        "frameworks":  ["NIST-SC-8", "CIS-Azure-6.3"],
    },

    # ━━━ POSTGRESQL (8) ━━━
    {
        "rule_id":     "AZ-PG-001",
        "severity":    "HIGH",
        "service":     "PostgreSQL",
        "title":       "PostgreSQL server SSL enforcement not enabled",
        "message":     "SSL is not enforced on the PostgreSQL server, allowing unencrypted database connections.",
        "remediation": "Enable SSL enforcement: PostgreSQL server → Connection security → SSL enforcement → Enabled.",
        "frameworks":  ["CIS-Azure-4.3.1", "NIST-SC-8", "PCI-4.1", "HIPAA-164.312", "SOC2-CC6.7"],
    },
    {
        "rule_id":     "AZ-PG-002",
        "severity":    "MEDIUM",
        "service":     "PostgreSQL",
        "title":       "PostgreSQL server geo-redundant backup not enabled",
        "message":     "Geo-redundant backup is not enabled for this PostgreSQL server.",
        "remediation": "Enable geo-redundant backup: PostgreSQL server → Pricing tier → Backup redundancy → Geographically redundant.",
        "frameworks":  ["CIS-Azure-4.3.2", "NIST-CP-9", "ISO27001-A.17.2", "SOC2-A1.2"],
    },
    {
        "rule_id":     "AZ-PG-003",
        "severity":    "HIGH",
        "service":     "PostgreSQL",
        "title":       "PostgreSQL server allows public network access",
        "message":     "Public network access is enabled for this PostgreSQL server.",
        "remediation": "Disable public access: PostgreSQL server → Connection security → Public network access → Disabled.",
        "frameworks":  ["CIS-Azure-4.3.3", "NIST-SC-7", "PCI-1.3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-PG-004",
        "severity":    "MEDIUM",
        "service":     "PostgreSQL",
        "title":       "PostgreSQL server connection throttling not enabled",
        "message":     "Connection throttling is not enabled, which can allow brute-force attacks on the database.",
        "remediation": "Enable connection throttling: PostgreSQL server → Server parameters → connection_throttling → ON.",
        "frameworks":  ["CIS-Azure-4.3.4", "NIST-AC-7", "PCI-8.1.6"],
    },
    {
        "rule_id":     "AZ-PG-005",
        "severity":    "LOW",
        "service":     "PostgreSQL",
        "title":       "PostgreSQL server log_checkpoints not enabled",
        "message":     "log_checkpoints parameter is not enabled. Checkpoint activity is not logged.",
        "remediation": "Enable: PostgreSQL server → Server parameters → log_checkpoints → ON.",
        "frameworks":  ["CIS-Azure-4.3.5", "NIST-AU-2"],
    },
    {
        "rule_id":     "AZ-PG-006",
        "severity":    "LOW",
        "service":     "PostgreSQL",
        "title":       "PostgreSQL server log_connections not enabled",
        "message":     "log_connections parameter is not enabled. Connection attempts are not logged.",
        "remediation": "Enable: PostgreSQL server → Server parameters → log_connections → ON.",
        "frameworks":  ["CIS-Azure-4.3.6", "NIST-AU-2", "PCI-10.2"],
    },
    {
        "rule_id":     "AZ-PG-007",
        "severity":    "LOW",
        "service":     "PostgreSQL",
        "title":       "PostgreSQL server log_disconnections not enabled",
        "message":     "log_disconnections parameter is not enabled. Session end events are not logged.",
        "remediation": "Enable: PostgreSQL server → Server parameters → log_disconnections → ON.",
        "frameworks":  ["CIS-Azure-4.3.7", "NIST-AU-2", "PCI-10.2"],
    },
    {
        "rule_id":     "AZ-PG-008",
        "severity":    "MEDIUM",
        "service":     "PostgreSQL",
        "title":       "PostgreSQL server audit logging not enabled",
        "message":     "pgAudit extension or audit logging is not enabled for this PostgreSQL server.",
        "remediation": "Enable audit logging: PostgreSQL server → Server parameters → pgaudit.log → set required categories.",
        "frameworks":  ["CIS-Azure-4.3.8", "NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },

    # ━━━ MYSQL (5) ━━━
    {
        "rule_id":     "AZ-MYSQL-001",
        "severity":    "HIGH",
        "service":     "MySQL",
        "title":       "MySQL server SSL enforcement not enabled",
        "message":     "SSL is not enforced on the MySQL server, allowing unencrypted database connections.",
        "remediation": "Enable SSL enforcement: MySQL server → Connection security → Enforce SSL connection → Enabled.",
        "frameworks":  ["CIS-Azure-4.4.1", "NIST-SC-8", "PCI-4.1", "HIPAA-164.312", "SOC2-CC6.7"],
    },
    {
        "rule_id":     "AZ-MYSQL-002",
        "severity":    "HIGH",
        "service":     "MySQL",
        "title":       "MySQL server allows public network access",
        "message":     "Public network access is enabled for this MySQL server.",
        "remediation": "Disable public access: MySQL server → Connection security → Public network access → Disabled.",
        "frameworks":  ["CIS-Azure-4.4.2", "NIST-SC-7", "PCI-1.3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-MYSQL-003",
        "severity":    "MEDIUM",
        "service":     "MySQL",
        "title":       "MySQL server geo-redundant backup not enabled",
        "message":     "Geo-redundant backup is not enabled for this MySQL server.",
        "remediation": "Enable geo-redundant backup: MySQL server → Pricing tier → Backup redundancy → Geographically redundant.",
        "frameworks":  ["CIS-Azure-4.4.3", "NIST-CP-9", "ISO27001-A.17.2", "SOC2-A1.2"],
    },
    {
        "rule_id":     "AZ-MYSQL-004",
        "severity":    "MEDIUM",
        "service":     "MySQL",
        "title":       "MySQL server audit logs not enabled",
        "message":     "Audit logging is not enabled for this MySQL server.",
        "remediation": "Enable audit logs: MySQL server → Server parameters → audit_log_enabled → ON.",
        "frameworks":  ["CIS-Azure-4.4.4", "NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-MYSQL-005",
        "severity":    "MEDIUM",
        "service":     "MySQL",
        "title":       "MySQL server minimum TLS version below 1.2",
        "message":     "MySQL server is not configured to enforce a minimum TLS version of 1.2.",
        "remediation": "Set TLS version: MySQL server → Connection security → Minimum TLS version → TLS 1.2.",
        "frameworks":  ["CIS-Azure-4.4.5", "NIST-SC-8", "PCI-4.1"],
    },

    # ━━━ EVENT HUB (4) ━━━
    {
        "rule_id":     "AZ-EH-001",
        "severity":    "HIGH",
        "service":     "Event Hub",
        "title":       "Event Hub namespace allows public network access",
        "message":     "Event Hub namespace is accessible from the public internet without network restrictions.",
        "remediation": "Restrict access: Event Hub namespace → Networking → Public network access → Disabled.",
        "frameworks":  ["CIS-Azure-12.1", "NIST-SC-7", "PCI-1.3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-EH-002",
        "severity":    "MEDIUM",
        "service":     "Event Hub",
        "title":       "Event Hub namespace not encrypted with CMK",
        "message":     "Event Hub namespace does not use Customer Managed Key encryption.",
        "remediation": "Configure CMK: Event Hub namespace → Encryption → Customer-managed keys.",
        "frameworks":  ["NIST-SC-28", "HIPAA-164.312", "ISO27001-A.10.1", "CIS-Azure-12.2"],
    },
    {
        "rule_id":     "AZ-EH-003",
        "severity":    "MEDIUM",
        "service":     "Event Hub",
        "title":       "Event Hub namespace diagnostic logging not enabled",
        "message":     "Diagnostic logs are not enabled for this Event Hub namespace.",
        "remediation": "Enable diagnostics: Event Hub namespace → Monitoring → Diagnostic settings → Add setting.",
        "frameworks":  ["NIST-AU-2", "CIS-Azure-12.3", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-EH-004",
        "severity":    "LOW",
        "service":     "Event Hub",
        "title":       "Event Hub auto-inflate enabled without maximum throughput cap",
        "message":     "Auto-inflate is enabled but no maximum throughput unit cap is set, risking uncontrolled cost escalation.",
        "remediation": "Set a maximum throughput unit cap: Event Hub namespace → Scale → Auto-inflate → set maximum units.",
        "frameworks":  ["NIST-SA-9", "ISO27001-A.12.1"],
    },

    # ━━━ SERVICE BUS (4) ━━━
    {
        "rule_id":     "AZ-SB-001",
        "severity":    "HIGH",
        "service":     "Service Bus",
        "title":       "Service Bus namespace allows public network access",
        "message":     "Service Bus namespace is accessible from the public internet.",
        "remediation": "Restrict access: Service Bus namespace → Networking → Public access → Disabled.",
        "frameworks":  ["CIS-Azure-11.1", "NIST-SC-7", "PCI-1.3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-SB-002",
        "severity":    "MEDIUM",
        "service":     "Service Bus",
        "title":       "Service Bus namespace not encrypted with CMK",
        "message":     "Service Bus namespace does not use Customer Managed Key encryption.",
        "remediation": "Configure CMK: Service Bus namespace → Encryption → Customer-managed keys.",
        "frameworks":  ["NIST-SC-28", "HIPAA-164.312", "ISO27001-A.10.1", "CIS-Azure-11.2"],
    },
    {
        "rule_id":     "AZ-SB-003",
        "severity":    "MEDIUM",
        "service":     "Service Bus",
        "title":       "Service Bus namespace minimum TLS version below 1.2",
        "message":     "Service Bus namespace is configured to accept TLS versions below 1.2.",
        "remediation": "Set minimum TLS: Service Bus namespace → Configuration → Minimum TLS version → 1.2.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1", "CIS-Azure-11.3"],
    },
    {
        "rule_id":     "AZ-SB-004",
        "severity":    "MEDIUM",
        "service":     "Service Bus",
        "title":       "Service Bus namespace local authentication not disabled",
        "message":     "Local SAS key authentication is enabled on Service Bus namespace. Azure AD authentication is preferred.",
        "remediation": "Disable local auth: Service Bus namespace → Configuration → Local Authentication → Disabled.",
        "frameworks":  ["CIS-Azure-11.4", "NIST-IA-2", "ISO27001-A.9.4", "SOC2-CC6.1"],
    },

    # ━━━ AZURE AD / ENTRA ID EXTENDED (8) ━━━
    {
        "rule_id":     "AZ-AADX-001",
        "severity":    "CRITICAL",
        "service":     "Azure AD",
        "title":       "MFA not enforced for privileged administrators",
        "message":     "Multi-factor authentication is not required for users with privileged admin roles.",
        "remediation": "Create Conditional Access policy requiring MFA for all admin roles.",
        "frameworks":  ["CIS-Azure-1.1", "NIST-IA-3", "PCI-8.4", "SOC2-CC6.1", "HIPAA-164.312", "GDPR-Art32"],
    },
    {
        "rule_id":     "AZ-AADX-002",
        "severity":    "HIGH",
        "service":     "Azure AD",
        "title":       "Guest user has Owner or privileged role assignment",
        "message":     "An external guest user has been assigned an Owner or highly privileged role in the subscription.",
        "remediation": "Remove Owner/Contributor role from guest users. Assign minimal required permissions.",
        "frameworks":  ["CIS-Azure-1.3", "NIST-AC-6", "ISO27001-A.9.2", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AZ-AADX-003",
        "severity":    "HIGH",
        "service":     "Azure AD",
        "title":       "Azure AD Privileged Identity Management not configured",
        "message":     "PIM is not configured, allowing permanent privileged role assignments without JIT approval.",
        "remediation": "Enable PIM: Azure AD → Privileged Identity Management → Azure AD roles → enable JIT for privileged roles.",
        "frameworks":  ["CIS-Azure-1.14", "NIST-AC-5", "ISO27001-A.9.2", "SOC2-CC6.3", "PCI-7.1"],
    },
    {
        "rule_id":     "AZ-AADX-004",
        "severity":    "HIGH",
        "service":     "Azure AD",
        "title":       "No Conditional Access policy requiring MFA for administrators",
        "message":     "No Conditional Access policy exists that enforces MFA specifically for administrator accounts.",
        "remediation": "Create CA policy: Azure AD → Security → Conditional Access → New policy → target admin roles → require MFA.",
        "frameworks":  ["CIS-Azure-1.2", "NIST-IA-3", "PCI-8.4", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AZ-AADX-005",
        "severity":    "MEDIUM",
        "service":     "Azure AD",
        "title":       "Azure AD Self-Service Password Reset not enabled",
        "message":     "SSPR is not enabled, forcing help desk password resets which can be a social engineering vector.",
        "remediation": "Enable SSPR: Azure AD → Password reset → Properties → enable for All or Selected users.",
        "frameworks":  ["CIS-Azure-1.7", "NIST-IA-5", "ISO27001-A.9.3"],
    },
    {
        "rule_id":     "AZ-AADX-006",
        "severity":    "HIGH",
        "service":     "Azure AD",
        "title":       "Legacy authentication protocols not blocked",
        "message":     "Legacy authentication (Basic Auth, SMTP AUTH) is not blocked, bypassing modern MFA controls.",
        "remediation": "Block legacy auth: Azure AD → Security → Conditional Access → Block legacy authentication policy.",
        "frameworks":  ["CIS-Azure-1.18", "NIST-IA-3", "PCI-8.3", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AZ-AADX-007",
        "severity":    "HIGH",
        "service":     "Azure AD",
        "title":       "Azure AD sign-in risk policy not configured",
        "message":     "No Identity Protection sign-in risk policy is configured to respond to risky sign-in events.",
        "remediation": "Configure sign-in risk policy: Azure AD → Security → Identity Protection → Sign-in risk policy.",
        "frameworks":  ["CIS-Azure-1.19", "NIST-AC-2", "SOC2-CC6.1", "ISO27001-A.9.1"],
    },
    {
        "rule_id":     "AZ-AADX-008",
        "severity":    "HIGH",
        "service":     "Azure AD",
        "title":       "Azure AD user risk policy not configured",
        "message":     "No Identity Protection user risk policy is configured to respond to compromised user accounts.",
        "remediation": "Configure user risk policy: Azure AD → Security → Identity Protection → User risk policy.",
        "frameworks":  ["CIS-Azure-1.20", "NIST-AC-2", "SOC2-CC6.1", "ISO27001-A.9.1"],
    },

    # ━━━ DEFENDER FOR CLOUD (6) ━━━
    {
        "rule_id":     "AZ-DFC-001",
        "severity":    "HIGH",
        "service":     "Defender for Cloud",
        "title":       "Microsoft Defender for Servers not enabled",
        "message":     "Defender for Servers plan is on the Free tier and not providing advanced threat protection.",
        "remediation": "Enable Defender for Servers: Defender for Cloud → Environment settings → Subscription → Defender plans → Servers → Standard.",
        "frameworks":  ["CIS-Azure-2.1", "NIST-SI-3", "PCI-5.1", "SOC2-CC7.1"],
    },
    {
        "rule_id":     "AZ-DFC-002",
        "severity":    "HIGH",
        "service":     "Defender for Cloud",
        "title":       "Microsoft Defender for SQL not enabled",
        "message":     "Defender for SQL databases is not enabled at the subscription level.",
        "remediation": "Enable Defender for SQL: Defender for Cloud → Environment settings → Defender plans → SQL → Standard.",
        "frameworks":  ["CIS-Azure-2.2", "NIST-SI-3", "PCI-5.1", "SOC2-CC7.1"],
    },
    {
        "rule_id":     "AZ-DFC-003",
        "severity":    "HIGH",
        "service":     "Defender for Cloud",
        "title":       "Microsoft Defender for Storage not enabled",
        "message":     "Defender for Storage is not enabled, leaving storage accounts without advanced threat detection.",
        "remediation": "Enable Defender for Storage: Defender for Cloud → Environment settings → Defender plans → Storage → Standard.",
        "frameworks":  ["CIS-Azure-2.3", "NIST-SI-3", "SOC2-CC7.1"],
    },
    {
        "rule_id":     "AZ-DFC-004",
        "severity":    "HIGH",
        "service":     "Defender for Cloud",
        "title":       "Microsoft Defender for Containers not enabled",
        "message":     "Defender for Containers is not enabled for AKS and container registry protection.",
        "remediation": "Enable Defender for Containers: Defender for Cloud → Environment settings → Defender plans → Containers → Standard.",
        "frameworks":  ["CIS-Azure-2.4", "NIST-SI-3", "SOC2-CC7.1"],
    },
    {
        "rule_id":     "AZ-DFC-005",
        "severity":    "HIGH",
        "service":     "Defender for Cloud",
        "title":       "Microsoft Defender for App Service not enabled",
        "message":     "Defender for App Service is not enabled, leaving web applications without threat detection.",
        "remediation": "Enable Defender for App Service: Defender for Cloud → Environment settings → Defender plans → App Service → Standard.",
        "frameworks":  ["CIS-Azure-2.5", "NIST-SI-3", "SOC2-CC7.1"],
    },
    {
        "rule_id":     "AZ-DFC-006",
        "severity":    "MEDIUM",
        "service":     "Defender for Cloud",
        "title":       "Defender for Cloud security score below threshold",
        "message":     "Microsoft Defender for Cloud security score is below the acceptable threshold.",
        "remediation": "Review and remediate Defender for Cloud recommendations to improve the security score.",
        "frameworks":  ["CIS-Azure-2.6", "NIST-RA-5", "SOC2-CC7.1"],
    },

    # ━━━ NETWORKING EXTENDED (5) ━━━
    {
        "rule_id":     "AZ-NET-001",
        "severity":    "HIGH",
        "service":     "Networking",
        "title":       "WAF not configured on Application Gateway",
        "message":     "Web Application Firewall is not enabled on this Application Gateway.",
        "remediation": "Enable WAF: Application Gateway → Web application firewall → Enable.",
        "frameworks":  ["CIS-Azure-6.8", "NIST-SC-7", "PCI-6.6", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AZ-NET-002",
        "severity":    "HIGH",
        "service":     "Networking",
        "title":       "Application Gateway not using WAF_v2 SKU",
        "message":     "Application Gateway is using a SKU that does not include WAF_v2 capabilities.",
        "remediation": "Migrate to WAF_v2 SKU for Application Gateway with improved WAF features.",
        "frameworks":  ["CIS-Azure-6.9", "NIST-SC-7", "PCI-6.6"],
    },
    {
        "rule_id":     "AZ-NET-003",
        "severity":    "MEDIUM",
        "service":     "Networking",
        "title":       "Network Watcher not enabled in region",
        "message":     "Azure Network Watcher is not enabled for this region, preventing network traffic analysis.",
        "remediation": "Enable Network Watcher: Network Watcher → Enable in the required region.",
        "frameworks":  ["CIS-Azure-6.5", "NIST-AU-12", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-NET-004",
        "severity":    "MEDIUM",
        "service":     "Networking",
        "title":       "VNet flow logs not enabled",
        "message":     "Virtual Network flow logs are not enabled, preventing visibility into network traffic patterns.",
        "remediation": "Enable VNet flow logs via Network Watcher → Flow logs → Add.",
        "frameworks":  ["CIS-Azure-6.4", "NIST-AU-2", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AZ-NET-005",
        "severity":    "HIGH",
        "service":     "Networking",
        "title":       "No DDoS Protection Standard plan associated",
        "message":     "No DDoS Protection Standard plan is associated with any virtual network in the subscription.",
        "remediation": "Enable DDoS Protection Standard: Virtual network → DDoS protection → Enable Standard.",
        "frameworks":  ["CIS-Azure-6.7", "NIST-SC-5", "ISO27001-A.13.1"],
    },

    # ━━━ AZURE KUBERNETES SERVICE EXTENDED (3 — merged with AZ-AKS above) ━━━
    # (AZ-AKS-006 through AZ-AKS-008 cover private cluster, Azure Policy addon, node disk encryption)

    # ━━━ LOGIC APPS (2) ━━━
    {
        "rule_id":     "AZ-LA-001",
        "severity":    "MEDIUM",
        "service":     "Logic Apps",
        "title":       "Logic App not using Managed Identity",
        "message":     "Logic App workflow does not use a Managed Identity for authenticating to Azure services.",
        "remediation": "Enable managed identity: Logic App → Identity → System assigned → On.",
        "frameworks":  ["CIS-Azure-10.1", "NIST-IA-5", "ISO27001-A.9.4", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AZ-LA-002",
        "severity":    "MEDIUM",
        "service":     "Logic Apps",
        "title":       "Logic App diagnostic logging not enabled",
        "message":     "Diagnostic logging is not configured for this Logic App.",
        "remediation": "Enable diagnostics: Logic App → Monitoring → Diagnostic settings → Add setting.",
        "frameworks":  ["CIS-Azure-10.2", "NIST-AU-2", "SOC2-CC7.2"],
    },

    # ━━━ AZURE FUNCTIONS (2) ━━━
    {
        "rule_id":     "AZ-FN-001",
        "severity":    "HIGH",
        "service":     "Azure Functions",
        "title":       "Azure Function app HTTP trigger without authentication",
        "message":     "Function app has HTTP-triggered functions with anonymous authorization level.",
        "remediation": "Change authorization level to Function or Admin: Function app → Functions → select function → Integration → Trigger → Authorization level.",
        "frameworks":  ["CIS-Azure-9.10", "NIST-IA-2", "PCI-8.2", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AZ-FN-002",
        "severity":    "MEDIUM",
        "service":     "Azure Functions",
        "title":       "Azure Function app not using Managed Identity",
        "message":     "Function app does not use a Managed Identity for authenticating to other Azure services.",
        "remediation": "Enable managed identity: Function app → Identity → System assigned → On.",
        "frameworks":  ["CIS-Azure-9.11", "NIST-IA-5", "ISO27001-A.9.4"],
    },
]


def check_azure_resources(resources: list) -> list:
    """
    Evaluate all Azure resources against AZURE_RULES.
    Returns a flat list of Finding objects.
    """
    findings = []
    for resource in resources:
        if resource.cloud != "azure":
            continue
        for rule in AZURE_RULES:
            finding = _evaluate_rule(resource, rule)
            if finding:
                findings.append(finding)
        # Evaluate custom rules
        findings.extend(evaluate_custom_rules(resource, "azure"))
    return findings


def _evaluate_rule(resource, rule: dict):
    """Map rule_id to check logic and return Finding if triggered."""
    rid = rule["rule_id"]
    triggered = False

    # ── Storage ──────────────────────────────────────────────────────────────
    if rid == "AZ-ST-001" and resource.resource_type == "storage_account":
        triggered = resource.is_public

    elif rid == "AZ-ST-002" and resource.resource_type == "storage_account":
        triggered = not resource.https_only

    elif rid == "AZ-ST-003" and resource.resource_type == "storage_account":
        # CMK check — is_encrypted defaults True (Azure default encryption), raw_config holds cmk info
        triggered = not resource.raw_config.get("cmk_encryption_enabled", False)

    elif rid == "AZ-ST-004" and resource.resource_type == "storage_account":
        triggered = not resource.tls_12_enforced

    elif rid == "AZ-ST-005" and resource.resource_type == "storage_account":
        triggered = not resource.logging_enabled

    elif rid == "AZ-ST-006" and resource.resource_type == "storage_account":
        triggered = resource.raw_config.get("allow_shared_key_access", True)

    elif rid == "AZ-ST-007" and resource.resource_type == "storage_account":
        redundancy = resource.raw_config.get("minimum_tls_version", "")
        sku_name = resource.raw_config.get("sku_name", resource.raw_config.get("sku", ""))
        triggered = str(sku_name).upper() not in ("GRS", "RAGRS", "GZRS", "RAGZRS")

    elif rid == "AZ-ST-008" and resource.resource_type == "storage_account":
        triggered = not resource.raw_config.get("blob_soft_delete_enabled", False)

    elif rid == "AZ-ST-009" and resource.resource_type == "storage_account":
        triggered = not resource.raw_config.get("container_soft_delete_enabled", False)

    elif rid == "AZ-ST-010" and resource.resource_type == "storage_account":
        # Flag accounts tagged as boot diagnostics storage without CMK
        is_boot_diag = resource.raw_config.get("is_boot_diagnostics_storage", False)
        has_cmk = resource.raw_config.get("cmk_encryption_enabled", False)
        triggered = is_boot_diag and not has_cmk

    # ── Virtual Machines ─────────────────────────────────────────────────────
    elif rid == "AZ-VM-001" and resource.resource_type == "virtual_machine":
        triggered = not resource.is_encrypted

    elif rid == "AZ-VM-002" and resource.resource_type == "virtual_machine":
        triggered = not resource.raw_config.get("data_disk_encryption_enabled", resource.is_encrypted)

    elif rid == "AZ-VM-003" and resource.resource_type == "virtual_machine":
        triggered = not resource.raw_config.get("endpoint_protection_installed", False)

    elif rid == "AZ-VM-004" and resource.resource_type == "virtual_machine":
        triggered = not resource.raw_config.get("automatic_updates_enabled", False)

    elif rid == "AZ-VM-005" and resource.resource_type == "virtual_machine":
        triggered = not resource.raw_config.get("boot_diagnostics_enabled", False)

    elif rid == "AZ-VM-006" and resource.resource_type == "virtual_machine":
        triggered = resource.raw_config.get("uses_unmanaged_disk", False)

    elif rid == "AZ-VM-007" and resource.resource_type == "virtual_machine":
        has_public_ip = resource.raw_config.get("has_public_ip", False)
        has_nsg = resource.raw_config.get("nsg_attached", True)
        triggered = has_public_ip and not has_nsg

    elif rid == "AZ-VM-008" and resource.resource_type == "virtual_machine":
        triggered = not resource.raw_config.get("vulnerability_assessment_enabled", False)

    elif rid == "AZ-VM-009" and resource.resource_type == "virtual_machine":
        triggered = not resource.raw_config.get("jit_access_enabled", False)

    elif rid == "AZ-VM-010" and resource.resource_type == "virtual_machine":
        triggered = not resource.raw_config.get("disk_encryption_set_cmk", False)

    elif rid == "AZ-VM-011" and resource.resource_type == "network_watcher":
        triggered = resource.raw_config.get("provisioning_state", "Succeeded") != "Succeeded"

    elif rid == "AZ-VM-012" and resource.resource_type == "virtual_machine":
        triggered = not resource.raw_config.get("backup_enabled", False)

    # ── NSG ──────────────────────────────────────────────────────────────────
    elif rid == "AZ-NSG-001" and resource.resource_type == "network_security_group":
        triggered = resource.rdp_open

    elif rid == "AZ-NSG-002" and resource.resource_type == "network_security_group":
        triggered = resource.ssh_open

    elif rid == "AZ-NSG-003" and resource.resource_type == "network_security_group":
        triggered = resource.all_traffic_open

    elif rid == "AZ-NSG-004" and resource.resource_type == "network_security_group":
        triggered = not resource.flow_logs

    elif rid == "AZ-NSG-005" and resource.resource_type == "network_security_group":
        triggered = resource.raw_config.get("http_open", False)

    elif rid == "AZ-NSG-006" and resource.resource_type == "network_security_group":
        triggered = not resource.raw_config.get("ddos_protection_enabled", False)

    # ── Key Vault ─────────────────────────────────────────────────────────────
    elif rid == "AZ-KV-001" and resource.resource_type == "key_vault":
        triggered = not resource.soft_delete

    elif rid == "AZ-KV-002" and resource.resource_type == "key_vault":
        triggered = not resource.purge_protection

    elif rid == "AZ-KV-003" and resource.resource_type == "key_vault":
        triggered = resource.is_public

    elif rid == "AZ-KV-004" and resource.resource_type == "key_vault":
        triggered = resource.raw_config.get("keys_without_expiry", 0) > 0

    elif rid == "AZ-KV-005" and resource.resource_type == "key_vault":
        triggered = resource.raw_config.get("secrets_without_expiry", 0) > 0

    elif rid == "AZ-KV-006" and resource.resource_type == "key_vault":
        triggered = not resource.raw_config.get("diagnostics_enabled", False)

    elif rid == "AZ-KV-007" and resource.resource_type == "key_vault":
        triggered = not resource.raw_config.get("firewall_enabled", False)

    elif rid == "AZ-KV-008" and resource.resource_type == "key_vault":
        triggered = not resource.raw_config.get("private_endpoint_configured", False)

    elif rid == "AZ-KV-009" and resource.resource_type == "key_vault":
        triggered = not resource.raw_config.get("rbac_authorization_enabled", False)

    # ── SQL ───────────────────────────────────────────────────────────────────
    elif rid == "AZ-SQL-001" and resource.resource_type == "sql_server":
        triggered = not resource.tde_enabled

    elif rid == "AZ-SQL-002" and resource.resource_type == "sql_server":
        triggered = not resource.auditing_enabled

    elif rid == "AZ-SQL-003" and resource.resource_type == "sql_server":
        triggered = resource.is_public

    elif rid == "AZ-SQL-004" and resource.resource_type == "sql_server":
        triggered = not resource.raw_config.get("atp_enabled", False)

    elif rid == "AZ-SQL-005" and resource.resource_type == "sql_server":
        retention = resource.raw_config.get("audit_retention_days", 0)
        triggered = int(retention) < 90

    elif rid == "AZ-SQL-006" and resource.resource_type == "sql_server":
        triggered = not resource.raw_config.get("aad_admin_configured", False)

    elif rid == "AZ-SQL-007" and resource.resource_type == "sql_server":
        triggered = not resource.raw_config.get("vulnerability_assessment_enabled", False)

    elif rid == "AZ-SQL-008" and resource.resource_type == "sql_server":
        triggered = resource.raw_config.get("firewall_rule_too_broad", False)

    elif rid == "AZ-SQL-009" and resource.resource_type == "sql_server":
        triggered = not resource.raw_config.get("aad_only_auth_enabled", False)

    elif rid == "AZ-SQL-010" and resource.resource_type == "sql_server":
        triggered = not resource.raw_config.get("geo_redundant_backup_enabled", False)

    # ── Active Directory ──────────────────────────────────────────────────────
    elif rid == "AZ-AD-001" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.mfa_enabled

    elif rid == "AZ-AD-002" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("conditional_access_policies_exist", False)

    elif rid == "AZ-AD-003" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("guest_permissions_restricted", False)

    elif rid == "AZ-AD-004" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("pim_enabled", False)

    elif rid == "AZ-AD-005" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("security_defaults_enabled", False)

    elif rid == "AZ-AD-006" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("access_reviews_configured", False)

    # ── Azure AD Extended ─────────────────────────────────────────────────────
    elif rid == "AZ-AADX-001" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("admin_mfa_enforced", False)

    elif rid == "AZ-AADX-002" and resource.resource_type == "azure_ad_policy":
        triggered = resource.raw_config.get("guest_with_owner_role", False)

    elif rid == "AZ-AADX-003" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("pim_configured", False)

    elif rid == "AZ-AADX-004" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("admin_mfa_ca_policy_exists", False)

    elif rid == "AZ-AADX-005" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("sspr_enabled", False)

    elif rid == "AZ-AADX-006" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("legacy_auth_blocked", False)

    elif rid == "AZ-AADX-007" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("sign_in_risk_policy_enabled", False)

    elif rid == "AZ-AADX-008" and resource.resource_type == "azure_ad_policy":
        triggered = not resource.raw_config.get("user_risk_policy_enabled", False)

    # ── Monitor ───────────────────────────────────────────────────────────────
    elif rid == "AZ-MON-001" and resource.resource_type == "activity_log_alerts":
        alerts = resource.raw_config.get("alerts", [])
        triggered = len(alerts) == 0

    elif rid == "AZ-MON-002" and resource.resource_type == "activity_log_alerts":
        triggered = resource.raw_config.get("retention_days", 0) < 365

    elif rid == "AZ-MON-003" and resource.resource_type == "activity_log_alerts":
        alerts = resource.raw_config.get("alerts", [])
        triggered = not _alert_exists_for_operation(alerts, "Microsoft.Authorization/policyAssignments/write")

    elif rid == "AZ-MON-004" and resource.resource_type == "activity_log_alerts":
        alerts = resource.raw_config.get("alerts", [])
        triggered = not _alert_exists_for_operation(alerts, "Microsoft.Network/networkSecurityGroups/write")

    elif rid == "AZ-MON-005" and resource.resource_type == "security_center":
        pricings = resource.raw_config.get("pricings", [])
        triggered = any(p.get("free_tier", True) for p in pricings)

    elif rid == "AZ-MON-006" and resource.resource_type == "activity_log_alerts":
        alerts = resource.raw_config.get("alerts", [])
        triggered = not _alert_exists_for_operation(alerts, "Microsoft.Network/networkSecurityGroups/securityRules/write")

    elif rid == "AZ-MON-007" and resource.resource_type == "activity_log_alerts":
        alerts = resource.raw_config.get("alerts", [])
        triggered = not _alert_exists_for_operation(alerts, "Microsoft.Authorization/roleAssignments/write")

    elif rid == "AZ-MON-008" and resource.resource_type == "log_analytics_workspace":
        triggered = not resource.raw_config.get("diagnostic_settings_all_resources", False)

    elif rid == "AZ-MON-009" and resource.resource_type == "log_analytics_workspace":
        retention = resource.raw_config.get("retention_in_days", 0)
        triggered = int(retention) < 90

    elif rid == "AZ-MON-010" and resource.resource_type == "activity_log_alerts":
        alerts = resource.raw_config.get("alerts", [])
        triggered = not _alert_exists_for_operation(alerts, "Microsoft.KeyVault/vaults/write")

    elif rid == "AZ-MON-011" and resource.resource_type == "activity_log_alerts":
        alerts = resource.raw_config.get("alerts", [])
        triggered = not _alert_exists_for_operation(alerts, "Microsoft.Sql/servers/firewallRules/write")

    elif rid == "AZ-MON-012" and resource.resource_type == "activity_log_alerts":
        triggered = not resource.raw_config.get("log_profile_complete", False)

    # ── App Service ───────────────────────────────────────────────────────────
    elif rid == "AZ-APP-001" and resource.resource_type == "app_service":
        triggered = not resource.https_only

    elif rid == "AZ-APP-002" and resource.resource_type == "app_service":
        tls = resource.raw_config.get("min_tls_version", "1.0")
        triggered = str(tls) < "1.2"

    elif rid == "AZ-APP-003" and resource.resource_type == "app_service":
        triggered = not resource.raw_config.get("auth_enabled", False)

    elif rid == "AZ-APP-004" and resource.resource_type == "app_service":
        triggered = resource.raw_config.get("remote_debugging", False)

    elif rid == "AZ-APP-005" and resource.resource_type == "app_service":
        triggered = not resource.logging_enabled

    elif rid == "AZ-APP-006" and resource.resource_type == "app_service":
        triggered = not resource.raw_config.get("managed_identity", False)

    elif rid == "AZ-APP-007" and resource.resource_type == "app_service":
        ftp = resource.raw_config.get("ftps_state", "AllAllowed")
        triggered = str(ftp).lower() not in ("disabled", "ftpsonly")

    elif rid == "AZ-APP-008" and resource.resource_type == "app_service":
        triggered = resource.raw_config.get("outdated_runtime", False)

    elif rid == "AZ-APP-009" and resource.resource_type == "app_service":
        triggered = not resource.raw_config.get("client_cert_enabled", False)

    # ── AKS ───────────────────────────────────────────────────────────────────
    elif rid == "AZ-AKS-001" and resource.resource_type == "aks_cluster":
        triggered = not resource.raw_config.get("api_server_access_restricted", False)

    elif rid == "AZ-AKS-002" and resource.resource_type == "aks_cluster":
        triggered = not resource.raw_config.get("rbac_enabled", True)

    elif rid == "AZ-AKS-003" and resource.resource_type == "aks_cluster":
        triggered = not resource.raw_config.get("monitoring_enabled", False)

    elif rid == "AZ-AKS-004" and resource.resource_type == "aks_cluster":
        triggered = resource.raw_config.get("outdated_k8s_version", False)

    elif rid == "AZ-AKS-005" and resource.resource_type == "aks_cluster":
        triggered = resource.raw_config.get("network_policy") is None

    elif rid == "AZ-AKS-006" and resource.resource_type == "aks_cluster":
        triggered = not resource.raw_config.get("private_cluster", False)

    elif rid == "AZ-AKS-007" and resource.resource_type == "aks_cluster":
        triggered = not resource.raw_config.get("azure_policy_enabled", False)

    elif rid == "AZ-AKS-008" and resource.resource_type == "aks_cluster":
        triggered = not resource.raw_config.get("disk_encryption", False)

    # ── Container Registry ────────────────────────────────────────────────────
    elif rid == "AZ-ACR-001" and resource.resource_type == "container_registry":
        triggered = resource.raw_config.get("admin_user_enabled", True)

    elif rid == "AZ-ACR-002" and resource.resource_type == "container_registry":
        triggered = str(resource.raw_config.get("public_network_access", "Enabled")) == "Enabled"

    elif rid == "AZ-ACR-003" and resource.resource_type == "container_registry":
        triggered = not resource.raw_config.get("vulnerability_scanning_enabled", False)

    elif rid == "AZ-ACR-004" and resource.resource_type == "container_registry":
        triggered = not resource.raw_config.get("geo_replication_enabled", False)

    elif rid == "AZ-ACR-005" and resource.resource_type == "container_registry":
        triggered = not resource.raw_config.get("webhook_configured", False)

    # ── Cosmos DB ─────────────────────────────────────────────────────────────
    elif rid == "AZ-CDB-001" and resource.resource_type == "cosmos_account":
        triggered = resource.is_public

    elif rid == "AZ-CDB-002" and resource.resource_type == "cosmos_account":
        triggered = not resource.raw_config.get("virtual_network_rules", False)

    elif rid == "AZ-CDB-003" and resource.resource_type == "cosmos_account":
        rules = resource.raw_config.get("ip_rules", [])
        # Flag if any rule is 0.0.0.0 or covers /0 or /8
        triggered = any(
            str(r).startswith("0.0.0.0") or str(r).endswith("/0") or str(r).endswith("/8")
            for r in rules
        )

    # ── Redis Cache ───────────────────────────────────────────────────────────
    elif rid == "AZ-RED-001" and resource.resource_type == "redis_cache":
        triggered = resource.raw_config.get("non_ssl_port_enabled", True)

    elif rid == "AZ-RED-002" and resource.resource_type == "redis_cache":
        triggered = str(resource.raw_config.get("public_network_access", "Enabled")) == "Enabled"

    elif rid == "AZ-RED-003" and resource.resource_type == "redis_cache":
        tls = resource.raw_config.get("tls_version", "1.0")
        triggered = str(tls) < "1.2"

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    elif rid == "AZ-PG-001" and resource.resource_type == "postgresql_server":
        triggered = str(resource.raw_config.get("ssl_enforcement", "Disabled")).lower() != "enabled"

    elif rid == "AZ-PG-002" and resource.resource_type == "postgresql_server":
        triggered = str(resource.raw_config.get("geo_redundant_backup", "Disabled")).lower() != "enabled"

    elif rid == "AZ-PG-003" and resource.resource_type == "postgresql_server":
        triggered = str(resource.raw_config.get("public_network_access", "Enabled")).lower() == "enabled"

    elif rid == "AZ-PG-004" and resource.resource_type == "postgresql_server":
        triggered = str(resource.raw_config.get("connection_throttling", "OFF")).upper() != "ON"

    elif rid == "AZ-PG-005" and resource.resource_type == "postgresql_server":
        triggered = str(resource.raw_config.get("log_checkpoints", "OFF")).upper() != "ON"

    elif rid == "AZ-PG-006" and resource.resource_type == "postgresql_server":
        triggered = str(resource.raw_config.get("log_connections", "OFF")).upper() != "ON"

    elif rid == "AZ-PG-007" and resource.resource_type == "postgresql_server":
        triggered = str(resource.raw_config.get("log_disconnections", "OFF")).upper() != "ON"

    elif rid == "AZ-PG-008" and resource.resource_type == "postgresql_server":
        triggered = not resource.raw_config.get("audit_log_enabled", False)

    # ── MySQL ─────────────────────────────────────────────────────────────────
    elif rid == "AZ-MYSQL-001" and resource.resource_type == "mysql_server":
        triggered = str(resource.raw_config.get("ssl_enforcement", "Disabled")).lower() != "enabled"

    elif rid == "AZ-MYSQL-002" and resource.resource_type == "mysql_server":
        triggered = str(resource.raw_config.get("public_network_access", "Enabled")).lower() == "enabled"

    elif rid == "AZ-MYSQL-003" and resource.resource_type == "mysql_server":
        triggered = str(resource.raw_config.get("geo_redundant_backup", "Disabled")).lower() != "enabled"

    elif rid == "AZ-MYSQL-004" and resource.resource_type == "mysql_server":
        triggered = not resource.raw_config.get("audit_log_enabled", False)

    elif rid == "AZ-MYSQL-005" and resource.resource_type == "mysql_server":
        tls = resource.raw_config.get("minimum_tls_version", "TLS1_0")
        triggered = str(tls) not in ("TLS1_2", "TLS1_3", "TLS 1.2", "1.2")

    # ── Event Hub ─────────────────────────────────────────────────────────────
    elif rid == "AZ-EH-001" and resource.resource_type == "event_hub_namespace":
        triggered = str(resource.raw_config.get("public_network_access", "Enabled")).lower() == "enabled"

    elif rid == "AZ-EH-002" and resource.resource_type == "event_hub_namespace":
        triggered = resource.raw_config.get("encryption") is None

    elif rid == "AZ-EH-003" and resource.resource_type == "event_hub_namespace":
        triggered = not resource.raw_config.get("diagnostics_enabled", False)

    elif rid == "AZ-EH-004" and resource.resource_type == "event_hub_namespace":
        auto_inflate = resource.raw_config.get("auto_inflate_enabled", False)
        max_units = resource.raw_config.get("maximum_throughput_units", None)
        triggered = auto_inflate and (max_units is None or int(max_units) == 0)

    # ── Service Bus ───────────────────────────────────────────────────────────
    elif rid == "AZ-SB-001" and resource.resource_type == "service_bus_namespace":
        triggered = str(resource.raw_config.get("public_network_access", "Enabled")).lower() == "enabled"

    elif rid == "AZ-SB-002" and resource.resource_type == "service_bus_namespace":
        triggered = resource.raw_config.get("encryption") is None

    elif rid == "AZ-SB-003" and resource.resource_type == "service_bus_namespace":
        tls = resource.raw_config.get("minimum_tls_version", "1.0")
        triggered = str(tls) not in ("1.2", "TLS1_2", "TLS 1.2")

    elif rid == "AZ-SB-004" and resource.resource_type == "service_bus_namespace":
        triggered = not resource.raw_config.get("disable_local_auth", False)

    # ── Defender for Cloud ────────────────────────────────────────────────────
    elif rid == "AZ-DFC-001" and resource.resource_type == "defender_plan":
        name = resource.raw_config.get("name", "")
        triggered = (
            "VirtualMachines" in name and
            resource.raw_config.get("free_tier", True)
        )

    elif rid == "AZ-DFC-002" and resource.resource_type == "defender_plan":
        name = resource.raw_config.get("name", "")
        triggered = (
            "SqlServers" in name and
            resource.raw_config.get("free_tier", True)
        )

    elif rid == "AZ-DFC-003" and resource.resource_type == "defender_plan":
        name = resource.raw_config.get("name", "")
        triggered = (
            "StorageAccounts" in name and
            resource.raw_config.get("free_tier", True)
        )

    elif rid == "AZ-DFC-004" and resource.resource_type == "defender_plan":
        name = resource.raw_config.get("name", "")
        triggered = (
            "Containers" in name and
            resource.raw_config.get("free_tier", True)
        )

    elif rid == "AZ-DFC-005" and resource.resource_type == "defender_plan":
        name = resource.raw_config.get("name", "")
        triggered = (
            "AppServices" in name and
            resource.raw_config.get("free_tier", True)
        )

    elif rid == "AZ-DFC-006" and resource.resource_type == "security_center":
        score = resource.raw_config.get("security_score", 100)
        triggered = float(score) < 70.0

    # ── Networking Extended ───────────────────────────────────────────────────
    elif rid == "AZ-NET-001" and resource.resource_type == "application_gateway":
        triggered = not resource.raw_config.get("waf_enabled", False)

    elif rid == "AZ-NET-002" and resource.resource_type == "application_gateway":
        sku = resource.raw_config.get("sku_name", "")
        triggered = str(sku).upper() != "WAF_V2"

    elif rid == "AZ-NET-003" and resource.resource_type == "network_watcher":
        triggered = resource.raw_config.get("provisioning_state", "Succeeded") != "Succeeded"

    elif rid == "AZ-NET-004" and resource.resource_type == "network_watcher":
        triggered = not resource.raw_config.get("flow_logs_enabled", False)

    elif rid == "AZ-NET-005" and resource.resource_type == "network_security_group":
        triggered = not resource.raw_config.get("ddos_protection_enabled", False)

    # ── Logic Apps ────────────────────────────────────────────────────────────
    elif rid == "AZ-LA-001" and resource.resource_type == "logic_app":
        triggered = resource.raw_config.get("identity") is None

    elif rid == "AZ-LA-002" and resource.resource_type == "logic_app":
        triggered = not resource.raw_config.get("diagnostics_enabled", False)

    # ── Azure Functions ───────────────────────────────────────────────────────
    elif rid == "AZ-FN-001" and resource.resource_type == "azure_function":
        triggered = resource.raw_config.get("anonymous_http_trigger", False)

    elif rid == "AZ-FN-002" and resource.resource_type == "azure_function":
        triggered = resource.raw_config.get("identity") is None

    if not triggered:
        return None

    return Finding(
        rule_id=rule["rule_id"],
        resource_id=resource.resource_id,
        resource_name=resource.name,
        severity=rule["severity"],
        message=rule["message"],
        remediation=rule["remediation"],
        cloud="azure",
        service=rule["service"],
        frameworks=rule["frameworks"],
        is_custom=False,
    )


def _alert_exists_for_operation(alerts: list, operation: str) -> bool:
    """
    Check whether any enabled activity log alert covers the given operation string.
    Looks through each alert's conditions for a matching equals value.
    """
    for alert in alerts:
        if not alert.get("enabled", True):
            continue
        for condition in alert.get("conditions", []):
            equals_val = (condition.get("equals") or "").lower()
            if operation.lower() in equals_val or equals_val in operation.lower():
                return True
    return False
