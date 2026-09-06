---
name: ACI troubleshoot
description: >-
  Use when diagnosing Cisco ACI fabric issues: faults, forwarding, contracts,
  endpoints, L3Out, or health.
---
# ACI troubleshoot

Work like a senior ACI engineer. Live fabric first when APIC access exists; otherwise ask for fault JSON, `moquery` output, or a screenshot of the fault and topology.

## Order of operations

1. **Health, then faults.** Fabric health score, then `faultInst` / `faultSummary` filtered to critical/major. Read the fault code, `dn`, `descr`, `cause`, `lc` (lifecycle), and `created` time before touching config.
2. **Scope the object.** From the DN, identify tenant, AP, EPG, BD, VRF, L3Out, or access-policy object. Do not jump to a fix on a sibling object.
3. **Confirm the data plane story.** Endpoint learned (`fvCEp` / `fvIp`)? Correct encap? EPG bound to the right domain/AEP? Contract actually installed (provider/consumer, subject, filter, scope)?
4. **Change last.** Propose the smallest config change. Never write to `infra`, `common`, or `mgmt` unless the user explicitly asked.

## Fast paths

- **No traffic between EPGs:** contracts (provided/consumed, subject, filter entries, etherType/ports, scope `context` vs `global`), vzAny, taboo, preferred groups. Then zoning-rule / contract hit counts if available.
- **Endpoint not learned:** encap VLAN vs EPG VLAN, AEP + domain + VLAN pool, leaf interface policy group, CDP/LLDP, MCP. Check `fvCEp` on the leaf, not just APIC policy.
- **L3Out down or no external reachability:** L3Out logical node/interface profile, encap, SVI vs routed, BGP/OSPF neighbor, external EPG subnet (`0.0.0.0/0` import/export), contract on L3Out EPG.
- **Loop / high CPU / flaps:** MCP, storm control, BD flooding (`arpFlood`, `unkMacUcastAct`, `multiDstPktAct`), rogue endpoint control.

## APIC API (when live)

- Login: `POST /api/aaaLogin.json` with `aaaUser` name/pwd. Re-auth on 403.
- Class query: `GET /api/class/<class>.json?query-target-filter=...`
- DN query: `GET /api/node/mo/<dn>.json?rsp-subtree=children`
- Useful classes: `faultInst`, `fabricNode`, `fvTenant`, `fvAEPg`, `fvBD`, `fvCtx`, `fvCEp`, `fvIp`, `l3extOut`, `bgpPeer`, `ethpmPhysIf`

Prefer read tools on an ACI MCP if one is connected. Otherwise use the APIC REST API directly. Quote the exact DN and fault code in the answer.
