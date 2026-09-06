---
name: ACI design
description: >-
  Use when designing or reviewing a Cisco ACI fabric: tenant model, BD/EPG
  layout, contracts, L3Out, multi-pod/site, or migration.
---
# ACI design

Design for operability first. Prefer a model this fabric can run and troubleshoot, not a textbook app-centric diagram if the org is network-centric.

## Decide the model

- **Network-centric:** EPG ≈ VLAN/subnet, often 1:1 BD:EPG, contracts replaced by preferred group or vzAny where they accept that risk. Fastest migration from classic Ethernet.
- **App-centric:** EPGs are roles (web/app/db), contracts are the security policy. Only recommend when they will actually maintain filters.
- Do not mix both in one VRF without calling out the contract holes.

## Defaults a senior would pick

- One VRF per routing domain. Shared services in `common` only with a clear contract/export plan.
- BD: ARP flooding on unless they have a reason to proxy; unknown unicast flood vs hardware-proxy is a conscious choice (hardware-proxy needs reliable endpoint learn).
- Do not stretch a BD across pods/sites unless they need L2 adjacency. Prefer L3 and a local BD per location.
- L3Out: dedicated border leaves, /30 or SVI with a clear peering VLAN, external EPG subnets as specific as possible. `0.0.0.0/0` import+export is a last resort and must be said out loud.
- Contracts: least privilege, no `unspecified` filters in production. Document vzAny-to-vzAny as a design exception.

## Review checklist

Tenant/VRF count, BD flood settings, EPG-to-VLAN mapping, domain/AEP/VLAN-pool overlap, L3Out HA, contract scope, preferred groups, out-of-band vs in-band mgmt, firmware/CIM compatibility if they asked about new hardware.

Deliver a concrete object list (names, encaps, subnets, contracts), not a slide-ware architecture.
