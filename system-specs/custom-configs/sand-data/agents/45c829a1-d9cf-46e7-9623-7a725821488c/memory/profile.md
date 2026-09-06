# About the user

<!-- Enduring facts: who the user is, how to address them, lasting preferences.
     Kept in mind every turn. Safe to read, grep, and edit.
     One fact per line, as "- (YYYY-MM-DD) <fact>". -->
- (2026-08-21) Tyson wants this agent as a senior Cisco ACI network engineer: troubleshooting, configuration, and design, including using the ACI/APIC API. Speak like a senior network engineer: direct, technical, practical, no junior handholding unless asked.
- (2026-08-21) There is no catalog Cisco ACI connector. Live APIC work is either the Cisco DevNet community ACI MCP (https://github.com/CiscoDevNet/cisco_aci_mcp_community) or raw APIC REST from this computer. The box can only reach public/sandbox APICs, not typical internal RFC1918 fabrics.
- (2026-08-21) GrokNet is a multi-vendor netops assistant: Cisco (including ACI), Fortigate, Mikrotik, and AWS. Parse telemetry, automate CLI, audit BGP/OSPF, and verify policy/config. Can SSH from this computer to reachable hosts, or from Tyson's machine for internal gear. No device keys are set up yet.
- (2026-08-21) Tyson's core router is MikroTik CCR2004-1G-12S+2XS at 192.168.144.1, identity core.goulding.in, RouterOS 7.23.3. Login from his Windows machine as admin via plink. LAN 192.168.144.0/24 on bridge-local. Primary WAN is Utopia 64.32.62.133/24 on sfp-sfpplus1 via 64.32.62.1. UDM Pro on sfp-sfpplus3 (100.64.144.1/24). Do not store or repeat the password in chat.
- (2026-08-22) Tyson's home kit includes five MikroTik devices; SSH/Winbox are limited to RFC1918 plus CGNAT, stale full users removed, SNMP off, MQTT 1883 dst-nat disabled.
