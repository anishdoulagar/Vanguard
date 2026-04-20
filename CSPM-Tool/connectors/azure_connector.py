"""
Azure Connector
Collects raw configuration data from Azure services.
Uses Service Principal (ClientSecretCredential) — credentials never stored.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from azure.identity import ClientSecretCredential
from azure.mgmt.resource  import ResourceManagementClient
from azure.mgmt.storage   import StorageManagementClient
from azure.mgmt.compute   import ComputeManagementClient
from azure.mgmt.network   import NetworkManagementClient
from azure.mgmt.keyvault  import KeyVaultManagementClient
from azure.mgmt.sql       import SqlManagementClient
from azure.mgmt.web       import WebSiteManagementClient
from azure.mgmt.containerservice import ContainerServiceClient
from azure.mgmt.containerregistry import ContainerRegistryManagementClient
from azure.mgmt.cosmosdb  import CosmosDBManagementClient
from azure.mgmt.redis     import RedisManagementClient
from azure.mgmt.monitor   import MonitorManagementClient
from azure.core.exceptions import HttpResponseError

try:
    from azure.mgmt.rdbms.postgresql import PostgreSQLManagementClient
    from azure.mgmt.rdbms.mysql import MySQLManagementClient
    from azure.mgmt.eventhub import EventHubManagementClient
    from azure.mgmt.servicebus import ServiceBusManagementClient
    from azure.mgmt.loganalytics import LogAnalyticsManagementClient
    from azure.mgmt.logic import LogicManagementClient
except ImportError:
    pass


class AzureConnector:
    def __init__(self, subscription_id: str, tenant_id: str,
                 client_id: str, client_secret: str,
                 rg_filter: str | None = None):
        self.subscription_id = subscription_id
        self.rg_filter       = rg_filter.lower() if rg_filter else None
        self._credential     = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )

    def _rg_ok(self, resource_id: str) -> bool:
        """Return True if the resource belongs to the filtered RG (or no filter set)."""
        if not self.rg_filter:
            return True
        parts = (resource_id or "").split("/")
        return len(parts) > 4 and parts[4].lower() == self.rg_filter

    def _resource_client(self):
        return ResourceManagementClient(self._credential, self.subscription_id)

    def _storage_client(self):
        return StorageManagementClient(self._credential, self.subscription_id)

    def _compute_client(self):
        return ComputeManagementClient(self._credential, self.subscription_id)

    def _network_client(self):
        return NetworkManagementClient(self._credential, self.subscription_id)

    def _keyvault_client(self):
        return KeyVaultManagementClient(self._credential, self.subscription_id)

    def _sql_client(self):
        return SqlManagementClient(self._credential, self.subscription_id)

    def test_connection(self):
        """Verify credentials by listing resource groups."""
        try:
            client = self._resource_client()
            list(client.resource_groups.list())
            return True
        except HttpResponseError as e:
            raise ConnectionError(f"Azure authentication failed: {e.message}")
        except Exception as e:
            raise ConnectionError(f"Azure connection error: {e}")

    def collect_all(self) -> dict:
        """Collect all Azure resource data in parallel."""
        collectors = {
            "storage_accounts":         self._collect_storage_accounts,
            "virtual_machines":         self._collect_virtual_machines,
            "network_security_groups":  self._collect_nsgs,
            "key_vaults":               self._collect_key_vaults,
            "sql_servers":              self._collect_sql_servers,
            "app_services":             self._collect_app_services,
            "aks_clusters":             self._collect_aks_clusters,
            "container_registries":     self._collect_container_registries,
            "cosmos_accounts":          self._collect_cosmos_db,
            "redis_caches":             self._collect_redis,
            "postgresql_servers":       self._collect_postgresql,
            "mysql_servers":            self._collect_mysql,
            "event_hub_namespaces":     self._collect_event_hub_namespaces,
            "service_bus_namespaces":   self._collect_service_bus_namespaces,
            "network_watchers":         self._collect_network_watchers,
            "application_gateways":     self._collect_application_gateways,
            "log_analytics_workspaces": self._collect_log_analytics_workspaces,
            "logic_apps":               self._collect_logic_apps,
            "defender_plans":           self._collect_defender_plans,
            "activity_log_alerts":      self._collect_activity_log_alerts,
            "security_center":          self._collect_security_center,
            "public_ips":               self._collect_public_ips,
            "load_balancers":           self._collect_load_balancers,
        }

        results = {}
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(fn): key for key, fn in collectors.items()}
            for future in as_completed(futures):
                key = futures[future]
                try:
                    results[key] = future.result()
                except Exception:
                    results[key] = []
        return results

    # ── Storage Accounts ─────────────────────────────────────────────────────

    def _collect_storage_accounts(self) -> list:
        try:
            client  = self._storage_client()
            accounts = list(client.storage_accounts.list())
            result  = []
            for sa in accounts:
                if not self._rg_ok(sa.id):
                    continue
                props = sa.properties or {}
                blob_props = None
                container_props = None
                try:
                    rg = sa.id.split("/")[4]
                    blob_props = client.blob_services.get_service_properties(rg, sa.name)
                except Exception:
                    pass

                try:
                    rg = sa.id.split("/")[4]
                    container_props = client.blob_services.get_service_properties(rg, sa.name)
                except Exception:
                    pass

                sku_name = sa.sku.name if sa.sku else "LRS"

                data = {
                    "id":                     sa.id,
                    "name":                   sa.name,
                    "location":               sa.location,
                    "allow_blob_public_access": getattr(props, "allow_blob_public_access", True),
                    "enable_https_traffic_only": getattr(props, "enable_https_traffic_only", False),
                    "minimum_tls_version":    str(getattr(props, "minimum_tls_version", "TLS1_0") or "TLS1_0"),
                    "is_encrypted":           True,  # Azure always encrypts by default
                    "cmk_encryption_enabled": bool(
                        getattr(getattr(props, "encryption", None), "key_source", "") == "Microsoft.Keyvault"
                        if getattr(props, "encryption", None) else False
                    ),
                    "allow_shared_key_access": getattr(props, "allow_shared_key_access", True),
                    "sku_name":               sku_name,
                    "logging_enabled":        False,
                    "is_boot_diagnostics_storage": False,  # Tagged externally
                }

                # Blob soft delete
                if blob_props:
                    delete_ret = getattr(blob_props, "delete_retention_policy", None)
                    data["blob_soft_delete_enabled"] = getattr(delete_ret, "enabled", False) if delete_ret else False
                else:
                    data["blob_soft_delete_enabled"] = False

                # Container soft delete
                if container_props:
                    container_del = getattr(container_props, "container_delete_retention_policy", None)
                    data["container_soft_delete_enabled"] = getattr(container_del, "enabled", False) if container_del else False
                else:
                    data["container_soft_delete_enabled"] = False

                result.append(data)
            return result
        except Exception:
            return []

    # ── Virtual Machines ─────────────────────────────────────────────────────

    def _collect_virtual_machines(self) -> list:
        try:
            client = self._compute_client()
            vms    = list(client.virtual_machines.list_all())
            result = []
            for vm in vms:
                if not self._rg_ok(vm.id):
                    continue
                # Check OS disk encryption
                encrypted = False
                data_disk_encrypted = False
                try:
                    os_disk  = vm.storage_profile.os_disk if vm.storage_profile else None
                    enc_obj  = getattr(os_disk, "encryption_settings", None) if os_disk else None
                    encrypted = getattr(enc_obj, "enabled", False) if enc_obj else False
                except Exception:
                    pass

                # Check data disk encryption
                try:
                    data_disks = vm.storage_profile.data_disks if vm.storage_profile else []
                    data_disk_encrypted = all(
                        getattr(getattr(d, "encryption_settings", None), "enabled", False)
                        for d in (data_disks or [])
                    ) if data_disks else True
                except Exception:
                    pass

                # Boot diagnostics
                boot_diag_enabled = False
                try:
                    diag = getattr(vm, "diagnostics_profile", None)
                    if diag:
                        boot = getattr(diag, "boot_diagnostics", None)
                        boot_diag_enabled = getattr(boot, "enabled", False) if boot else False
                except Exception:
                    pass

                # Managed disk check
                uses_unmanaged = False
                try:
                    if vm.storage_profile and vm.storage_profile.os_disk:
                        uses_unmanaged = vm.storage_profile.os_disk.vhd is not None
                except Exception:
                    pass

                # Identity
                has_managed_identity = vm.identity is not None

                # Disk Encryption Set CMK
                disk_enc_set_cmk = False
                try:
                    if vm.storage_profile and vm.storage_profile.os_disk:
                        des = getattr(vm.storage_profile.os_disk, "managed_disk", None)
                        if des:
                            disk_enc_set_cmk = getattr(des, "disk_encryption_set", None) is not None
                except Exception:
                    pass

                result.append({
                    "id":                      vm.id,
                    "name":                    vm.name,
                    "location":                vm.location,
                    "disk_encryption_enabled": encrypted,
                    "data_disk_encryption_enabled": data_disk_encrypted,
                    "boot_diagnostics_enabled": boot_diag_enabled,
                    "uses_unmanaged_disk":      uses_unmanaged,
                    "managed_identity":         has_managed_identity,
                    "disk_encryption_set_cmk":  disk_enc_set_cmk,
                    "automatic_updates_enabled": getattr(
                        getattr(vm, "os_profile", None), "windows_configuration", None
                    ) and getattr(
                        getattr(getattr(vm, "os_profile", None), "windows_configuration", None),
                        "enable_automatic_updates", False
                    ),
                    # Fields requiring Defender/Backup integration — default safe
                    "vulnerability_assessment_enabled": False,
                    "jit_access_enabled":              False,
                    "backup_enabled":                  False,
                    "endpoint_protection_installed":   False,
                    "has_public_ip":                   False,
                    "nsg_attached":                    True,
                })
            return result
        except Exception:
            return []

    # ── Network Security Groups ───────────────────────────────────────────────

    def _collect_nsgs(self) -> list:
        try:
            client = self._network_client()
            nsgs   = list(client.network_security_groups.list_all())
            result = []
            for nsg in nsgs:
                if not self._rg_ok(nsg.id):
                    continue
                rdp_open  = False
                ssh_open  = False
                http_open = False
                all_open  = False

                for rule in (nsg.security_rules or []):
                    if rule.direction != "Inbound":
                        continue
                    if rule.access != "Allow":
                        continue
                    src = rule.source_address_prefix or ""
                    if src not in ("*", "Internet", "0.0.0.0/0", "Any"):
                        continue
                    dest_port = rule.destination_port_range or ""
                    port_ranges = rule.destination_port_ranges or []
                    all_ports = [dest_port] + list(port_ranges)
                    for port_str in all_ports:
                        port_str = str(port_str).strip()
                        if port_str == "*":
                            rdp_open = ssh_open = http_open = all_open = True
                        elif "-" in port_str:
                            try:
                                lo, hi = port_str.split("-")
                                lo, hi = int(lo), int(hi)
                                if lo <= 22 <= hi:   ssh_open  = True
                                if lo <= 3389 <= hi: rdp_open  = True
                                if lo <= 80 <= hi:   http_open = True
                                if lo == 0 and hi >= 65535: all_open = True
                            except ValueError:
                                pass
                        else:
                            try:
                                p = int(port_str)
                                if p == 22:   ssh_open  = True
                                if p == 3389: rdp_open  = True
                                if p == 80:   http_open = True
                            except ValueError:
                                pass

                result.append({
                    "id":                nsg.id,
                    "name":              nsg.name,
                    "location":          nsg.location,
                    "rdp_open":          rdp_open,
                    "ssh_open":          ssh_open,
                    "http_open":         http_open,
                    "all_traffic_open":  all_open,
                    "flow_logs_enabled": False,  # Requires Network Watcher check
                    "ddos_protection_enabled": False,
                })
            return result
        except Exception:
            return []

    # ── Key Vaults ────────────────────────────────────────────────────────────

    def _collect_key_vaults(self) -> list:
        try:
            client = self._keyvault_client()
            vaults = list(client.vaults.list())
            result = []
            for vault in vaults:
                if not self._rg_ok(vault.id):
                    continue
                rg = vault.id.split("/")[4]
                try:
                    detail = client.vaults.get(rg, vault.name)
                    props  = detail.properties
                    net    = getattr(props, "network_acls", None)
                    public = True
                    if net:
                        default_action = getattr(net, "default_action", "Allow")
                        public = str(default_action).lower() == "allow"

                    firewall_enabled = not public

                    # Private endpoint
                    private_endpoints = getattr(props, "private_endpoint_connections", None) or []
                    private_endpoint_configured = len(list(private_endpoints)) > 0

                    # RBAC authorization
                    rbac_enabled = getattr(props, "enable_rbac_authorization", False)

                    result.append({
                        "id":                       vault.id,
                        "name":                     vault.name,
                        "location":                 vault.location,
                        "soft_delete_enabled":      getattr(props, "enable_soft_delete", False),
                        "purge_protection_enabled": getattr(props, "enable_purge_protection", False),
                        "network_acls_default_deny": not public,
                        "firewall_enabled":         firewall_enabled,
                        "private_endpoint_configured": private_endpoint_configured,
                        "rbac_authorization_enabled": bool(rbac_enabled),
                        "diagnostics_enabled":      False,  # Requires Monitor API
                        "keys_without_expiry":      0,      # Requires data-plane access
                        "secrets_without_expiry":   0,      # Requires data-plane access
                    })
                except Exception:
                    result.append({
                        "id":                       vault.id,
                        "name":                     vault.name,
                        "location":                 getattr(vault, "location", "unknown"),
                        "soft_delete_enabled":      False,
                        "purge_protection_enabled": False,
                        "network_acls_default_deny": False,
                        "firewall_enabled":         False,
                        "private_endpoint_configured": False,
                        "rbac_authorization_enabled": False,
                        "diagnostics_enabled":      False,
                        "keys_without_expiry":      0,
                        "secrets_without_expiry":   0,
                    })
            return result
        except Exception:
            return []

    # ── SQL Servers ───────────────────────────────────────────────────────────

    def _collect_sql_servers(self) -> list:
        try:
            client  = self._sql_client()
            servers = list(client.servers.list())
            result  = []
            for server in servers:
                if not self._rg_ok(server.id):
                    continue
                rg = server.id.split("/")[4]

                # TDE (check per database)
                tde = False
                try:
                    for db in client.databases.list_by_server(rg, server.name):
                        if db.name == "master":
                            continue
                        tde_cfg = client.transparent_data_encryptions.get(
                            rg, server.name, db.name, "current"
                        )
                        tde = getattr(tde_cfg, "status", "Disabled") == "Enabled"
                        break  # Check first non-master DB
                except Exception:
                    pass

                # Auditing
                auditing = False
                audit_retention = 0
                try:
                    audit_cfg = client.server_blob_auditing_policies.get(rg, server.name)
                    auditing = getattr(audit_cfg, "state", "Disabled") == "Enabled"
                    audit_retention = getattr(audit_cfg, "retention_days", 0) or 0
                except Exception:
                    pass

                # Advanced Threat Protection
                atp_enabled = False
                try:
                    atp = client.server_security_alert_policies.get(rg, server.name, "Default")
                    atp_enabled = getattr(atp, "state", "Disabled") == "Enabled"
                except Exception:
                    pass

                # AAD admin
                aad_admin = False
                try:
                    admins = list(client.server_azure_ad_administrators.list_by_server(rg, server.name))
                    aad_admin = len(admins) > 0
                except Exception:
                    pass

                # Firewall rules — check for overly broad ranges
                firewall_too_broad = False
                try:
                    fw_rules = list(client.firewall_rules.list_by_server(rg, server.name))
                    for fw in fw_rules:
                        start = getattr(fw, "start_ip_address", "")
                        end = getattr(fw, "end_ip_address", "")
                        if start == "0.0.0.0" and end == "255.255.255.255":
                            firewall_too_broad = True
                            break
                        if start == "0.0.0.0" and end == "0.0.0.0":
                            firewall_too_broad = True
                            break
                except Exception:
                    pass

                # Vulnerability assessment
                vuln_enabled = False
                try:
                    va = client.server_vulnerability_assessments.get(rg, server.name, "default")
                    vuln_enabled = va is not None
                except Exception:
                    pass

                public_access = str(
                    getattr(server.properties if hasattr(server, "properties") else server,
                            "public_network_access", "Enabled")
                )

                result.append({
                    "id":                           server.id,
                    "name":                         server.name,
                    "location":                     server.location,
                    "tde_enabled":                  tde,
                    "auditing_enabled":             auditing,
                    "audit_retention_days":         int(audit_retention),
                    "public_network_access":        public_access,
                    "atp_enabled":                  atp_enabled,
                    "aad_admin_configured":         aad_admin,
                    "firewall_rule_too_broad":       firewall_too_broad,
                    "vulnerability_assessment_enabled": vuln_enabled,
                    "aad_only_auth_enabled":        False,  # Requires newer SDK property check
                    "geo_redundant_backup_enabled": False,  # Per-database property
                })
            return result
        except Exception:
            return []

    # ── App Services ──────────────────────────────────────────────────────────

    def _collect_app_services(self) -> list:
        try:
            client = WebSiteManagementClient(self._credential, self.subscription_id)
            apps = list(client.web_apps.list())
            result = []
            for app in apps:
                if not self._rg_ok(app.id):
                    continue
                rg = app.resource_group
                config = None
                try:
                    config = client.web_apps.get_configuration(rg, app.name)
                except Exception:
                    pass

                # Determine if auth is enabled (requires separate call)
                auth_enabled = False
                try:
                    auth_settings = client.web_apps.get_auth_settings(rg, app.name)
                    auth_enabled = getattr(auth_settings, "enabled", False)
                except Exception:
                    pass

                # Detect outdated runtimes
                outdated_runtime = False
                if config:
                    py_ver = str(getattr(config, "python_version", "") or "")
                    php_ver = str(getattr(config, "php_version", "") or "")
                    java_ver = str(getattr(config, "java_version", "") or "")
                    net_fw = str(getattr(config, "net_framework_version", "") or "")
                    # Simple heuristic: very old versions
                    if py_ver and py_ver not in ("", "3.11", "3.10", "3.9", "3.8"):
                        outdated_runtime = True
                    if php_ver and php_ver not in ("", "8.2", "8.1", "8.0"):
                        outdated_runtime = True

                data = {
                    "id":                  app.id,
                    "name":                app.name,
                    "location":            app.location,
                    "https_only":          getattr(app, "https_only", False),
                    "client_cert_enabled": getattr(app, "client_cert_enabled", False),
                    "managed_identity":    app.identity is not None,
                    "auth_enabled":        auth_enabled,
                    "outdated_runtime":    outdated_runtime,
                }
                if config:
                    data["min_tls_version"]  = str(getattr(config, "min_tls_version", "1.0") or "1.0")
                    data["http20_enabled"]   = getattr(config, "http20_enabled", False)
                    data["ftps_state"]       = str(getattr(config, "ftps_state", "AllAllowed") or "AllAllowed")
                    data["remote_debugging"] = getattr(config, "remote_debugging_enabled", False)
                else:
                    data["min_tls_version"]  = "1.0"
                    data["http20_enabled"]   = False
                    data["ftps_state"]       = "AllAllowed"
                    data["remote_debugging"] = False
                result.append(data)
            return result
        except Exception:
            return []

    # ── AKS Clusters ─────────────────────────────────────────────────────────

    def _collect_aks_clusters(self) -> list:
        try:
            client   = ContainerServiceClient(self._credential, self.subscription_id)
            clusters = list(client.managed_clusters.list())
            result   = []
            for c in clusters:
                if not self._rg_ok(c.id):
                    continue
                addon_profiles = c.addon_profiles or {}

                # Azure Policy addon
                azure_policy_enabled = False
                for addon_name, addon_val in addon_profiles.items():
                    if "policy" in addon_name.lower():
                        azure_policy_enabled = getattr(addon_val, "enabled", False)

                monitoring_enabled = "omsagent" in addon_profiles or "azuremonitormetrics" in addon_profiles

                # Authorized IP / private cluster
                api_profile = getattr(c, "api_server_access_profile", None)
                private_cluster = getattr(api_profile, "enable_private_cluster", False) if api_profile else False
                authorized_ips = getattr(api_profile, "authorized_ip_ranges", None) if api_profile else None
                api_restricted = private_cluster or bool(authorized_ips)

                # Network policy
                network_policy = None
                if c.network_profile:
                    network_policy = getattr(c.network_profile, "network_policy", None)

                # Version check — flag if less than a recent baseline
                k8s_version = getattr(c, "kubernetes_version", "")
                outdated = False
                try:
                    major, minor = str(k8s_version).split(".")[:2]
                    outdated = int(minor) < 28  # Flag anything older than 1.28 as outdated
                except Exception:
                    pass

                data = {
                    "id":                        c.id,
                    "name":                      c.name,
                    "location":                  c.location,
                    "rbac_enabled":              getattr(c, "enable_rbac", False),
                    "network_policy":            network_policy,
                    "disk_encryption":           c.disk_encryption_set_id is not None,
                    "private_cluster":           private_cluster,
                    "api_server_access_restricted": api_restricted,
                    "azure_policy_enabled":      azure_policy_enabled,
                    "monitoring_enabled":        monitoring_enabled,
                    "kubernetes_version":        k8s_version,
                    "outdated_k8s_version":      outdated,
                }
                result.append(data)
            return result
        except Exception:
            return []

    # ── Container Registries ──────────────────────────────────────────────────

    def _collect_container_registries(self) -> list:
        try:
            client     = ContainerRegistryManagementClient(self._credential, self.subscription_id)
            registries = list(client.registries.list())
            result     = []
            for reg in registries:
                if not self._rg_ok(reg.id):
                    continue
                # Geo-replication
                geo_replication_enabled = False
                try:
                    replications = list(client.replications.list(reg.id.split("/")[4], reg.name))
                    geo_replication_enabled = len(replications) > 0
                except Exception:
                    pass

                # Webhooks
                webhook_configured = False
                try:
                    webhooks = list(client.webhooks.list(reg.id.split("/")[4], reg.name))
                    webhook_configured = len(webhooks) > 0
                except Exception:
                    pass

                data = {
                    "id":                       reg.id,
                    "name":                     reg.name,
                    "location":                 reg.location,
                    "admin_user_enabled":       getattr(reg, "admin_user_enabled", True),
                    "sku":                      reg.sku.name if reg.sku else "Basic",
                    "public_network_access":    str(getattr(reg, "public_network_access", "Enabled")),
                    "network_rule_set":         reg.network_rule_set is not None,
                    "encryption_enabled":       reg.encryption is not None,
                    "content_trust_enabled":    getattr(getattr(reg, "trust_policy", None), "status", "disabled") == "enabled",
                    "geo_replication_enabled":  geo_replication_enabled,
                    "webhook_configured":       webhook_configured,
                    "vulnerability_scanning_enabled": False,  # Requires Defender for Containers
                }
                result.append(data)
            return result
        except Exception:
            return []

    # ── Cosmos DB ─────────────────────────────────────────────────────────────

    def _collect_cosmos_db(self) -> list:
        try:
            client   = CosmosDBManagementClient(self._credential, self.subscription_id)
            accounts = list(client.database_accounts.list())
            result   = []
            for acc in accounts:
                if not self._rg_ok(acc.id):
                    continue
                ip_rules = getattr(acc, "ip_rules", []) or []
                ip_rule_values = [getattr(r, "ip_address_or_range", str(r)) for r in ip_rules]

                result.append({
                    "id":                    acc.id,
                    "name":                  acc.name,
                    "location":              acc.location,
                    "automatic_failover":    getattr(acc, "enable_automatic_failover", False),
                    "multi_region_writes":   getattr(acc, "enable_multiple_write_locations", False),
                    "public_network_access": str(getattr(acc, "public_network_access", "Enabled")),
                    "ip_rules":              ip_rule_values,
                    "ip_rules_configured":   len(ip_rules) > 0,
                    "virtual_network_rules": getattr(acc, "virtual_network_rules", []) or [],
                    "cmk_enabled":           bool(getattr(acc, "key_vault_key_uri", None)),
                    "backup_policy":         type(getattr(acc, "backup_policy", None)).__name__,
                })
            return result
        except Exception:
            return []

    # ── Redis Cache ───────────────────────────────────────────────────────────

    def _collect_redis(self) -> list:
        try:
            client = RedisManagementClient(self._credential, self.subscription_id)
            caches = list(client.redis.list())
            result = []
            for cache in caches:
                if not self._rg_ok(cache.id):
                    continue
                result.append({
                    "id":                   cache.id,
                    "name":                 cache.name,
                    "location":             cache.location,
                    "sku":                  cache.sku.name if cache.sku else "Basic",
                    "non_ssl_port_enabled": getattr(cache, "enable_non_ssl_port", True),
                    "tls_version":          str(getattr(cache, "minimum_tls_version", "1.0") or "1.0"),
                    "public_network_access": str(getattr(cache, "public_network_access", "Enabled")),
                    "auth_enabled":         not getattr(cache, "redis_configuration", None) or
                                            bool(getattr(cache.redis_configuration, "auth_not_required", None) != "1"),
                })
            return result
        except Exception:
            return []

    # ── PostgreSQL Servers ────────────────────────────────────────────────────

    def _collect_postgresql(self) -> list:
        try:
            try:
                from azure.mgmt.rdbms.postgresql import PostgreSQLManagementClient as PGClient
            except ImportError:
                return []

            client  = PGClient(self._credential, self.subscription_id)
            servers = list(client.servers.list())
            result  = []
            for sv in servers:
                if not self._rg_ok(sv.id):
                    continue
                rg = sv.id.split("/")[4]

                # Collect server parameters for log/connection settings
                log_checkpoints = "OFF"
                log_connections = "OFF"
                log_disconnections = "OFF"
                connection_throttling = "OFF"
                audit_log_enabled = False

                try:
                    params = list(client.configurations.list_by_server(rg, sv.name))
                    for param in params:
                        pname = (param.name or "").lower()
                        pval = str(getattr(param, "value", "off") or "off").upper()
                        if pname == "log_checkpoints":
                            log_checkpoints = pval
                        elif pname == "log_connections":
                            log_connections = pval
                        elif pname == "log_disconnections":
                            log_disconnections = pval
                        elif pname == "connection_throttling":
                            connection_throttling = pval
                        elif pname in ("pgaudit.log", "audit_log_enabled"):
                            audit_log_enabled = pval not in ("OFF", "NONE", "0", "FALSE")
                except Exception:
                    pass

                result.append({
                    "id":                   sv.id,
                    "name":                 sv.name,
                    "location":             sv.location,
                    "ssl_enforcement":      str(getattr(sv, "ssl_enforcement", "Disabled")),
                    "backup_retention_days": getattr(getattr(sv, "storage_profile", None), "backup_retention_days", 7),
                    "geo_redundant_backup": str(
                        getattr(getattr(sv, "storage_profile", None), "geo_redundant_backup", "Disabled") or "Disabled"
                    ),
                    "public_network_access": str(getattr(sv, "public_network_access", "Enabled") or "Enabled"),
                    "version":              str(getattr(sv, "version", "") or ""),
                    "admin_login":          getattr(sv, "administrator_login", ""),
                    "log_checkpoints":      log_checkpoints,
                    "log_connections":      log_connections,
                    "log_disconnections":   log_disconnections,
                    "connection_throttling": connection_throttling,
                    "audit_log_enabled":    audit_log_enabled,
                })
            return result
        except Exception:
            return []

    # ── MySQL Servers ─────────────────────────────────────────────────────────

    def _collect_mysql(self) -> list:
        try:
            try:
                from azure.mgmt.rdbms.mysql import MySQLManagementClient as MySQLClient
            except ImportError:
                return []

            client  = MySQLClient(self._credential, self.subscription_id)
            servers = list(client.servers.list())
            result  = []
            for sv in servers:
                if not self._rg_ok(sv.id):
                    continue
                rg = sv.id.split("/")[4]

                # Server parameters
                audit_log_enabled = False
                minimum_tls = "TLS1_0"

                try:
                    params = list(client.configurations.list_by_server(rg, sv.name))
                    for param in params:
                        pname = (param.name or "").lower()
                        pval = str(getattr(param, "value", "") or "")
                        if pname == "audit_log_enabled":
                            audit_log_enabled = pval.upper() in ("ON", "TRUE", "1")
                        elif pname in ("tls_version", "ssl_min_protocol_version"):
                            minimum_tls = pval
                except Exception:
                    pass

                result.append({
                    "id":                   sv.id,
                    "name":                 sv.name,
                    "location":             sv.location,
                    "ssl_enforcement":      str(getattr(sv, "ssl_enforcement", "Disabled")),
                    "public_network_access": str(getattr(sv, "public_network_access", "Enabled") or "Enabled"),
                    "geo_redundant_backup": str(
                        getattr(getattr(sv, "storage_profile", None), "geo_redundant_backup", "Disabled") or "Disabled"
                    ),
                    "version":              str(getattr(sv, "version", "") or ""),
                    "minimum_tls_version":  minimum_tls,
                    "audit_log_enabled":    audit_log_enabled,
                    "backup_retention_days": getattr(getattr(sv, "storage_profile", None), "backup_retention_days", 7),
                })
            return result
        except Exception:
            return []

    # ── Event Hub Namespaces ──────────────────────────────────────────────────

    def _collect_event_hub_namespaces(self) -> list:
        try:
            try:
                from azure.mgmt.eventhub import EventHubManagementClient as EHClient
            except ImportError:
                return []

            client     = EHClient(self._credential, self.subscription_id)
            namespaces = list(client.namespaces.list())
            result     = []
            for ns in namespaces:
                if not self._rg_ok(ns.id):
                    continue
                encryption = getattr(ns, "encryption", None)
                sku_name = ns.sku.name if ns.sku else "Basic"

                # Diagnostic logging check (simplified — would need Monitor client)
                result.append({
                    "id":                       ns.id,
                    "name":                     ns.name,
                    "location":                 ns.location,
                    "sku_name":                 sku_name,
                    "public_network_access":    str(getattr(ns, "public_network_access", "Enabled") or "Enabled"),
                    "encryption":               encryption,
                    "kafka_enabled":            getattr(ns, "kafka_enabled", False),
                    "zone_redundant":           getattr(ns, "zone_redundant", False),
                    "auto_inflate_enabled":     getattr(ns, "is_auto_inflate_enabled", False),
                    "maximum_throughput_units": getattr(ns, "maximum_throughput_units", None),
                    "diagnostics_enabled":      False,  # Requires Monitor API
                })
            return result
        except Exception:
            return []

    # ── Service Bus Namespaces ────────────────────────────────────────────────

    def _collect_service_bus_namespaces(self) -> list:
        try:
            try:
                from azure.mgmt.servicebus import ServiceBusManagementClient as SBClient
            except ImportError:
                return []

            client     = SBClient(self._credential, self.subscription_id)
            namespaces = list(client.namespaces.list())
            result     = []
            for ns in namespaces:
                if not self._rg_ok(ns.id):
                    continue
                encryption = getattr(ns, "encryption", None)
                sku_name = ns.sku.name if ns.sku else "Basic"

                result.append({
                    "id":                    ns.id,
                    "name":                  ns.name,
                    "location":              ns.location,
                    "sku_name":              sku_name,
                    "public_network_access": str(getattr(ns, "public_network_access", "Enabled") or "Enabled"),
                    "encryption":            encryption,
                    "minimum_tls_version":   str(getattr(ns, "minimum_tls_version", "1.0") or "1.0"),
                    "disable_local_auth":    getattr(ns, "disable_local_auth", False),
                    "zone_redundant":        getattr(ns, "zone_redundancy", False),
                })
            return result
        except Exception:
            return []

    # ── Network Watchers ──────────────────────────────────────────────────────

    def _collect_network_watchers(self) -> list:
        try:
            client   = self._network_client()
            watchers = list(client.network_watchers.list_all())
            result   = []
            for watcher in watchers:
                if not self._rg_ok(watcher.id):
                    continue
                # Flow logs
                flow_logs_enabled = False
                try:
                    rg = watcher.id.split("/")[4]
                    flow_logs = list(client.flow_logs.list(rg, watcher.name))
                    flow_logs_enabled = any(
                        getattr(fl, "enabled", False) for fl in flow_logs
                    )
                except Exception:
                    pass

                result.append({
                    "id":                 watcher.id,
                    "name":               watcher.name,
                    "location":           watcher.location,
                    "provisioning_state": str(getattr(watcher, "provisioning_state", "Unknown")),
                    "flow_logs_enabled":  flow_logs_enabled,
                })
            return result
        except Exception:
            return []

    # ── Application Gateways ──────────────────────────────────────────────────

    def _collect_application_gateways(self) -> list:
        try:
            client   = self._network_client()
            gateways = list(client.application_gateways.list_all())
            result   = []
            for gw in gateways:
                if not self._rg_ok(gw.id):
                    continue
                sku_name = ""
                try:
                    sku_name = gw.sku.name if gw.sku else ""
                except Exception:
                    pass

                waf_enabled = False
                waf_config  = getattr(gw, "web_application_firewall_configuration", None)
                if waf_config:
                    waf_enabled = getattr(waf_config, "enabled", False)
                # WAF_v2 SKU also implies WAF support
                if str(sku_name).upper() == "WAF_V2":
                    waf_enabled = True

                ssl_policy = getattr(gw, "ssl_policy", None)
                ssl_policy_name = str(getattr(ssl_policy, "policy_name", "") or "") if ssl_policy else ""

                frontend_ips = [
                    {
                        "name": getattr(fe, "name", ""),
                        "public": getattr(fe, "public_ip_address", None) is not None,
                    }
                    for fe in (gw.frontend_ip_configurations or [])
                ]

                result.append({
                    "id":              gw.id,
                    "name":            gw.name,
                    "location":        gw.location,
                    "sku_name":        sku_name,
                    "waf_enabled":     waf_enabled,
                    "waf_config":      waf_config is not None,
                    "ssl_policy":      ssl_policy_name,
                    "frontend_ips":    frontend_ips,
                })
            return result
        except Exception:
            return []

    # ── Log Analytics Workspaces ──────────────────────────────────────────────

    def _collect_log_analytics_workspaces(self) -> list:
        try:
            try:
                from azure.mgmt.loganalytics import LogAnalyticsManagementClient as LAClient
            except ImportError:
                return []

            client     = LAClient(self._credential, self.subscription_id)
            workspaces = list(client.workspaces.list())
            result     = []
            for ws in workspaces:
                if not self._rg_ok(ws.id):
                    continue
                sku_name = ws.sku.name if ws.sku else "PerGB2018"

                result.append({
                    "id":                              ws.id,
                    "name":                            ws.name,
                    "location":                        ws.location,
                    "retention_in_days":               getattr(ws, "retention_in_days", 30) or 30,
                    "sku_name":                        sku_name,
                    "public_network_access_for_ingestion": str(
                        getattr(ws, "public_network_access_for_ingestion", "Enabled") or "Enabled"
                    ),
                    "public_network_access_for_query": str(
                        getattr(ws, "public_network_access_for_query", "Enabled") or "Enabled"
                    ),
                    "diagnostic_settings_all_resources": False,  # Requires policy evaluation
                })
            return result
        except Exception:
            return []

    # ── Logic Apps ────────────────────────────────────────────────────────────

    def _collect_logic_apps(self) -> list:
        try:
            try:
                from azure.mgmt.logic import LogicManagementClient as LogicClient
            except ImportError:
                return []

            client    = LogicClient(self._credential, self.subscription_id)
            workflows = list(client.workflows.list_by_subscription())
            result    = []
            for wf in workflows:
                if not self._rg_ok(wf.id):
                    continue
                identity = getattr(wf, "identity", None)

                # Diagnostic logging (simplified)
                result.append({
                    "id":                 wf.id,
                    "name":               wf.name,
                    "location":           wf.location,
                    "identity":           identity,
                    "state":              str(getattr(wf, "state", "Unknown")),
                    "sku":                str(getattr(getattr(wf, "sku", None), "name", "") or ""),
                    "diagnostics_enabled": False,  # Requires Monitor API call
                })
            return result
        except Exception:
            return []

    # ── Defender Plans ────────────────────────────────────────────────────────

    def _collect_defender_plans(self) -> list:
        try:
            try:
                from azure.mgmt.security import SecurityCenter
            except ImportError:
                return []

            client   = SecurityCenter(self._credential, self.subscription_id, "")
            pricings = list(client.pricings.list())
            result   = []
            for pricing in pricings:
                result.append({
                    "id":           pricing.id,
                    "name":         pricing.name,
                    "pricing_tier": str(getattr(pricing, "pricing_tier", "Free")),
                    "free_tier":    str(getattr(pricing, "pricing_tier", "Free")) == "Free",
                })
            return result
        except Exception:
            return []

    # ── Activity Log Alerts ───────────────────────────────────────────────────

    def _collect_activity_log_alerts(self) -> list:
        try:
            client = MonitorManagementClient(self._credential, self.subscription_id)
            alerts = list(client.activity_log_alerts.list_by_subscription_id())
            result = []
            for alert in alerts:
                conditions = []
                if alert.condition:
                    for cond in (alert.condition.all_of or []):
                        conditions.append({
                            "field":  cond.field,
                            "equals": cond.equals,
                        })
                result.append({
                    "id":         alert.id,
                    "name":       alert.name,
                    "location":   alert.location,
                    "enabled":    getattr(alert, "enabled", True),
                    "conditions": conditions,
                })
            return result
        except Exception:
            return []

    # ── Security Center ───────────────────────────────────────────────────────

    def _collect_security_center(self) -> list:
        """Collect basic security center / Defender for Cloud status."""
        try:
            from azure.mgmt.security import SecurityCenter
            client = SecurityCenter(self._credential, self.subscription_id, "")
            pricings = list(client.pricings.list())
            result = []
            for pricing in pricings:
                result.append({
                    "id":           pricing.id,
                    "name":         pricing.name,
                    "pricing_tier": str(getattr(pricing, "pricing_tier", "Free")),
                    "free_tier":    str(getattr(pricing, "pricing_tier", "Free")) == "Free",
                })
            return result
        except Exception:
            return []

    # ── Public IPs ────────────────────────────────────────────────────────────

    def _collect_public_ips(self) -> list:
        try:
            client = self._network_client()
            ips    = list(client.public_ip_addresses.list_all())
            result = []
            for ip in ips:
                if not self._rg_ok(ip.id):
                    continue
                result.append({
                    "id":              ip.id,
                    "name":            ip.name,
                    "location":        ip.location,
                    "ip_address":      getattr(ip, "ip_address", None),
                    "ddos_protection": getattr(ip, "ddos_settings", None) is not None,
                    "dns_label":       getattr(getattr(ip, "dns_settings", None), "domain_name_label", None),
                })
            return result
        except Exception:
            return []

    # ── Load Balancers ────────────────────────────────────────────────────────

    def _collect_load_balancers(self) -> list:
        try:
            client = self._network_client()
            lbs    = list(client.load_balancers.list_all())
            result = []
            for lb in lbs:
                if not self._rg_ok(lb.id):
                    continue
                result.append({
                    "id":             lb.id,
                    "name":           lb.name,
                    "location":       lb.location,
                    "sku":            lb.sku.name if lb.sku else "Basic",
                    "frontend_count": len(lb.frontend_ip_configurations or []),
                    "backend_count":  len(lb.backend_address_pools or []),
                    "is_basic_sku":   (lb.sku.name if lb.sku else "Basic") == "Basic",
                })
            return result
        except Exception:
            return []
