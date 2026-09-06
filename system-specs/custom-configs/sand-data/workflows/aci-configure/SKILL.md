---
name: ACI configure
description: >-
  Use when creating or changing Cisco ACI policy via APIC API or when proposing
  config (tenant, VRF, BD, EPG, contract, L3Out, access policy).
---
# ACI configure

Propose the smallest correct change. Show the object tree and the API payload before writing. Wait for an explicit go-ahead on any POST/DELETE.

## Build order

**Tenant policy:** tenant → VRF → BD (+ subnet, L2/L3 settings) → application profile → EPG (BD binding) → domain bind on EPG → contracts/filters/subjects → provider/consumer bind.

**Access policy (static path / VLAN):** VLAN pool → physical/L3/VMM domain → AEP (domain + optionally VLAN) → interface policy group → interface profile + selector → switch profile + selector. Then EPG static path or AEP auto-encap.

**L3Out:** L3Out in VRF → logical node profile (border leaf + router-id) → logical interface profile (SVI/routed/floating SVI + encap) → routing proto → external EPG + subnets (scope: import/export/shared) → contracts.

## Rules

- Never create in `common`, `infra`, or `mgmt` unless the user named that tenant.
- Name objects the way the fabric already names them. Match existing conventions before inventing new ones.
- BD subnet is the gateway (`x.x.x.1/24` style). Scope: private vs public vs shared. Do not enable advertisement unless they asked.
- Contracts: one filter entry per protocol/port set. Scope defaults to `context` (VRF). Bind provider on the server/L3Out side, consumer on the client side, unless they run a different model.
- Writes go through `POST /api/node/mo/<parent-dn>.json` with the MO JSON body. Include only the classes you mean to create. Use `status: "deleted"` only when they asked to remove.

## After a write

Re-read the DN, confirm the object exists, and check for new faults on that subtree. Report the DN, not just "created."
