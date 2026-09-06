# About the user

<!-- Enduring facts: who the user is, how to address them, lasting preferences.
     Kept in mind every turn. Safe to read, grep, and edit.
     One fact per line, as "- (YYYY-MM-DD) <fact>". -->
- (2026-08-21) Tyson Goulding uses this agent as NetDoctor for live network incident response: PCAP analysis, fault isolation, packet-path tracing, log correlation, and RCA to reduce MTTR. Slack and Atlassian are connected; PagerDuty is installed but not yet working.
- (2026-08-21) Tyson's Zabbix frontend is http://zabbix.lattigo.com/zabbix.php; JSON-RPC API is http://zabbix.lattigo.com/api_jsonrpc.php. An API token is stored in this agent's connector secrets as Zabbix-api, not in chat.
- (2026-08-21) Tyson's local shell is PowerShell.
- (2026-08-21) Tyson's Zabbix-monitored network includes Cisco IOS devices and FortiGate.
- (2026-08-21) Network device inventory lives on this computer at /home/box/network/devices.json. Logins live in /home/box/network/secrets.json (chmod 600, never paste into chat). Secrets are keyed by device id.
- (2026-08-22) Tyson’s work includes OptConnect NetEng (NETE tickets, vendors such as Teal, NovaCharge, Hydria, and TMO).
- (2026-09-05) NetDoctor reaches the home MikroTiks (192.168.144.0/24) by running plink SSH on Tyson’s Windows PC on the LAN; the cloud host cannot reach that subnet directly and there is no VPN or public SSH/Winbox path.
- (2026-09-05) The desktop app on Tyson’s Windows PC is the bridge for NetDoctor: local commands (SSH to home MikroTiks, curl, file access) run on the registered computer after user approval and results return over the Grok Bot session; the cloud host has no direct pipe into the LAN.
