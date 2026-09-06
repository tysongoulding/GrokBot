---
name: OptConnect network knowledge
description: >-
  Use when answering OptConnect questions about hostnames, device access, IP
  allocation, carrier capabilities, IPsec/PtP forms, Net-Eng Confluence, net-eng
  repo, or Machine_configuration repo.
---
# OptConnect network knowledge

Use this when the question is about OptConnect or Lattigo naming, device access, IP/CIDR allocation, carrier capabilities, IPsec/PtP tunnels, Net-Eng process, or device/machine config.

## Source of truth

Look these up live. Do not treat memory as a copy. Do not paste passwords, PSKs, or keys into chat.

### Confluence (process and standards)

Space key `NetEng`: https://optconnect.atlassian.net/wiki/spaces/NetEng/overview

Search with CQL: `space = NetEng AND type = page` plus the topic. Every page in this space is official.

Known pages include Net-Eng SOP: Network Products, Net-Eng Standard: Nomenclature, Net-Eng Standard: Jira, Net-Eng: Change Request, Net-Eng SOP: Cali SSH Access, Net-Eng SOP: APN Forms.

### Google Drive

1. **nomenclature** — `1TLdsdv0VcaN_qTxVxHOCC3y1RZpJM0bg4oUjz53HWuI`
2. **Net-Eng Bridge Week 1** — `1rQjZSPO4Xl6lB_AurEdPmowJYj2c0eFDIpX1yUCxESk` (Access tab has live credentials; never paste them)
3. **PWS-PN-Network Allocation** — `15huAKbhJ5jR5JyimVruxAvpbeWn4TimE`
4. **CarrierMatrix** — `1UZuXDVl4cbmmhUa45ltvFRlLE3cqo8IF`
5. **IPsec / PtP** — folder `18oinR3cUUIv4xQULAZcKFIp0VUCFOlQR`, template `1PmO4PXVZhxRZuqUwG4miNBo7K-JtjCqgbwkvUe-AJEo`

### GitHub (code and configs)

These two private repos are official sources. Read them remotely with `gh` / the GitHub API. Do not clone unless Tyson asks. Do not dump the `secrets` tree into chat.

1. **https://github.com/OptConnect/net-eng** (private, default branch `main`)
   Network Engineering Stuff.
   Top level: `Network_configurations`, `net-eng-ansible`, `stacks`, `Solutions`, `radius`, `NTOP`, `Nettools`, `Carrier-True-High-Availability-NETE146`, `docker-dev`, `netclaw`, `registry`, `blacklist`, `zabbix-snmp-v3`, `sops`, `secrets`.
   Agent notes: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`.

2. **https://github.com/PremierWireless/Machine_configuration** (private, default branch `master`)
   Config files for Lattigo systems.
   Top level: `aws`, `cdk-stacks`, `cloudformation-stacks`, `customer_projects`, `docs`, `internal-projects`, `lattigo-as-carrier`, `lattigo-python`, `oc-integrations`, `production-resource-configuration-backups`, `pws-ansible`, `security`, `staging-cdk-stacks`, `aurora-python-tools`, `zendesk`, `utils`.

How to read: `gh api repos/OptConnect/net-eng/contents/<path>` and `gh api repos/PremierWireless/Machine_configuration/contents/<path>`. If `gh auth status` is not logged in, use the stored GitHub PAT as `GH_TOKEN` for those calls only. Never print the token.

## How to answer

1. Search Confluence NetEng, Drive, and these two repos as needed.
2. Read only what is needed.
3. Cite the page, sheet, or repo path.
4. If the answer would include a secret, stop and link the source instead.
