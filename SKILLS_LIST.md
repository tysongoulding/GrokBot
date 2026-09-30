# GrokBot Skills Directory & Comprehensive Catalog

Catalog of all 73 `SKILL.md` skill definitions extracted from the GrokBot cloud microVM environment, complete with functional descriptions, triggers, and clickable relative file links.

---

## 📊 Summary by Category

- **Custom Network & Operations Workflows**: 5
- **Managed Bot System Skills**: 12
- **AWS Core Skills & Architecture Guides**: 24
- **Atlassian (Jira & Confluence) Skills**: 6
- **Slack Integration & Messaging Skills**: 6
- **Context-Mode Optimization Skills**: 7 (Cache) + 7 (Marketplace Mirror)
- **Developer & Observability Marketplace Skills (1Password, Grafana, PagerDuty)**: 3
- **Playwright & Browser Automation Skills**: 3
- **Total `SKILL.md` Files**: 73

---

## 📑 Table of Contents

1. [Custom Workflows](#1-custom-workflows)
2. [Managed Bot Skills](#2-managed-bot-skills)
3. [Atlassian (Jira & Confluence) Skills](#3-atlassian-jira--confluence-skills)
4. [Slack Collaboration Skills](#4-slack-collaboration-skills)
5. [AWS Cloud Infrastructure Skills](#5-aws-cloud-infrastructure-skills)
6. [Context Compression & Token Mode Skills](#6-context-compression--token-mode-skills)
7. [Developer & Observability Marketplace Skills](#7-developer--observability-marketplace-skills)
8. [Playwright & Browser Automation Skills](#8-playwright--browser-automation-skills)

---

## 1. Custom Workflows (5 skills)

| Skill Name | Trigger / Purpose | File Link |
| :--- | :--- | :--- |
| **`ACI configure`** | Use when creating or changing Cisco ACI policy via APIC API or when proposing config (tenant, VRF, BD, EPG, contract, L3Out, access policy). | [`SKILL.md`](system-specs/custom-configs/sand-data/workflows/aci-configure/SKILL.md) |
| **`ACI design`** | Use when designing or reviewing a Cisco ACI fabric: tenant model, BD/EPG layout, contracts, L3Out, multi-pod/site, or migration. | [`SKILL.md`](system-specs/custom-configs/sand-data/workflows/aci-design/SKILL.md) |
| **`ACI troubleshoot`** | Use when diagnosing Cisco ACI fabric issues: faults, forwarding, contracts, endpoints, L3Out, or health. | [`SKILL.md`](system-specs/custom-configs/sand-data/workflows/aci-troubleshoot/SKILL.md) |
| **`Check Google Chat Net-Eng Alerts`** | Use when checking unread Google Chat, especially the Net-Eng - Alerts space, via signed-in Chat in the browser. | [`SKILL.md`](system-specs/custom-configs/sand-data/workflows/check-google-chat-net-eng-alerts/SKILL.md) |
| **`OptConnect network knowledge`** | Use when answering OptConnect questions about hostnames, device access, IP allocation, carrier capabilities, IPsec/PtP forms, Net-Eng Confluence, net-eng repo, or Machine_config... | [`SKILL.md`](system-specs/custom-configs/sand-data/workflows/optconnect-network-knowledge/SKILL.md) |

## 2. Managed Bot Skills (12 skills)

| Skill Name | Trigger / Purpose | File Link |
| :--- | :--- | :--- |
| **`add-connector`** | Walk through connecting a new MCP connector — search the catalog, install, and authenticate. | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/add-connector/SKILL.md) |
| **`box-desktop`** | When a task needs your own desktop or browser — a website with no connector, a GUI app, a sign-in only the user can complete — before you dispatch the first browser or desktop s... | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/box-desktop/SKILL.md) |
| **`channels`** | When you are woken by an [inbound] message or reaction from an outside messaging channel, or the user asks to connect or disconnect one. | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/channels/SKILL.md) |
| **`code-changes`** | When the user asks for a new code project or app, a feature, a bug fix, a refactor, or an investigation of how code behaves in a repository, before you start on it; also for any... | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/code-changes/SKILL.md) |
| **`export-bot-template`** | Create a shareable copy of this bot's setup. Use when the user wants to share or export this bot. | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/export-bot-template/SKILL.md) |
| **`group-chat-turns`** | When a user message starts with a [room "…"] tag: you are taking a turn in a group chat room, not your private chat, so read this before replying. | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/group-chat-turns/SKILL.md) |
| **`learn-from-demonstration`** | Turn a screen-recorded demonstration on your computer into a reusable skill. Use when a teach recording finishes. | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/learn-from-demonstration/SKILL.md) |
| **`no-connector-fallback`** | When a service the user needs has no connector, a connector is missing or needs installing or auth, a box CLI such as `gh` needs a login, or a browser workflow hits a sign-in wall. | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/no-connector-fallback/SKILL.md) |
| **`purchases`** | When the user asks you to buy, book, order, or pay for something — read before you start shopping or booking, not only at checkout. | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/purchases/SKILL.md) |
| **`routines`** | When the user asks for anything recurring, scheduled, or event-driven — a reminder, digest, monitor, "let me know when", or a change to an existing routine — before you create o... | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/routines/SKILL.md) |
| **`send-on-behalf`** | When the user asks you to write, draft, reply to, or send an email or message as them on an outside platform (Slack, email, another chat app). | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/send-on-behalf/SKILL.md) |
| **`skill-authoring`** | When you notice a reusable multi-step task worth saving, or the user asks you to save, change, or delete a skill. | [`SKILL.md`](system-specs/custom-configs/sand-data/managed-skills/skills/skill-authoring/SKILL.md) |

## 3. Atlassian (Jira & Confluence) Skills (6 skills)

| Skill Name | Trigger / Purpose | File Link |
| :--- | :--- | :--- |
| **`capture-tasks-from-meeting-notes`** | "Analyze meeting notes to find action items and create Jira tasks for assigned work. When an agent needs to: (1) Create Jira tasks or tickets from meeting notes, (2) Extract or ... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/19f71578abc4e52543505b362c0b6e456a8a80d3/skills/capture-tasks-from-meeting-notes/SKILL.md) |
| **`generate-status-report`** | "Generate project status reports from Jira issues and publish to Confluence. When an agent needs to: (1) Create a status report for a project, (2) Summarize project progress or ... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/19f71578abc4e52543505b362c0b6e456a8a80d3/skills/generate-status-report/SKILL.md) |
| **`jira-sprint-dashboard`** | Create a visual Jira sprint dashboard from Jira project, space, sprint, board, filter, JQL, work item keys, or Jira URL data. Use when the user asks for a Jira sprint dashboard,... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/19f71578abc4e52543505b362c0b6e456a8a80d3/skills/jira-sprint-dashboard-canvas/SKILL.md) |
| **`search-company-knowledge`** | "Search across company knowledge bases (Confluence, Jira, internal docs) to find and explain internal concepts, processes, and technical details. When an agent needs to: (1) Fin... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/19f71578abc4e52543505b362c0b6e456a8a80d3/skills/search-company-knowledge/SKILL.md) |
| **`spec-to-backlog`** | "Automatically convert Confluence specification documents into structured Jira backlogs with Epics and implementation tickets. When an agent needs to: (1) Create Jira tickets fr... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/19f71578abc4e52543505b362c0b6e456a8a80d3/skills/spec-to-backlog/SKILL.md) |
| **`triage-issue`** | "Intelligently triage bug reports and error messages by searching for duplicates in Jira and offering to create new issues or add comments to existing ones. When an agent needs ... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/atlassian/19f71578abc4e52543505b362c0b6e456a8a80d3/skills/triage-issue/SKILL.md) |

## 4. Slack Collaboration Skills (6 skills)

| Skill Name | Trigger / Purpose | File Link |
| :--- | :--- | :--- |
| **`block-kit`** | 'Help developers build and validate Block Kit layouts for Slack messages, modals, and Home tabs. Provides authoritative block references and validates with the blocks.validate A... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/skills/block-kit/SKILL.md) |
| **`create-slack-app`** | Guide developers through creating a Slack app or agent using the Slack CLI and Bolt (JS or Python). Handles prerequisites, sandbox setup, authentication, project creation from t... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/skills/create-slack-app/SKILL.md) |
| **`slack-api`** | "Discover, navigate, and call Slack Web API methods (the family.method endpoints at slack.com/api like chat.postMessage, conversations.history, users.info, views.open). Use this... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/skills/slack-api/SKILL.md) |
| **`slack-cli`** | Use the Slack CLI to create, run, and manage Slack apps from the terminal. Use whenever the developer wants to log in, add a team, switch workspaces, or authenticate with Slack;... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/skills/slack-cli/SKILL.md) |
| **`slack-messaging`** | Guidance for composing well-formatted, effective Slack messages using standard markdown | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/skills/slack-messaging/SKILL.md) |
| **`slack-search`** | Guidance for effectively searching Slack to find messages, files, channels, and people | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/slack/e75b0cf18f1a19f3fd629e3af9565ee84b8c2ce0/skills/slack-search/SKILL.md) |

## 5. AWS Cloud Infrastructure Skills (24 skills)

| Skill Name | Trigger / Purpose | File Link |
| :--- | :--- | :--- |
| **`amazon-bedrock`** | Builds generative AI applications on Amazon Bedrock. Covers model invocation (Converse API, InvokeModel), RAG with Knowledge Bases, Bedrock Agents, Guardrails, and AgentCore (in... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/amazon-bedrock/SKILL.md) |
| **`aws-ai-ml`** | > Selects, deploys, and customizes AI models on Amazon SageMaker. Fine-tuning (SFT, DPO, RLVR, RLAIF), model selection, dataset preparation, evaluation, deployment to SageMaker ... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-ai-ml/SKILL.md) |
| **`aws-auth`** | > Adds user authentication to web and mobile apps with Amazon Cognito (user pools and identity pools) and the AWS Amplify client auth libraries. Covers sign-up/sign-in flows and... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-auth/SKILL.md) |
| **`aws-billing-and-cost-management`** | Analyze AWS costs, find savings, manage budgets, evaluate Savings Plans and Reserved Instances, right-size EC2/Lambda/RDS/EBS with Compute Optimizer, look up service pricing, qu... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-billing-and-cost-management/SKILL.md) |
| **`aws-blocks`** | Guides building full-stack applications with AWS Blocks — an Infrastructure-from-Code framework. Applies when creating APIs, selecting Building Blocks (KVStore, DistributedTable... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-blocks/SKILL.md) |
| **`aws-cdk`** | Authors, deploys, and troubleshoots AWS infrastructure using CDK with TypeScript or Python. Covers best practices, stack architecture, and construct patterns. Always use when wr... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-cdk/SKILL.md) |
| **`aws-cloudformation`** | Authors, validates, and troubleshoots AWS CloudFormation templates. Covers template authoring with secure defaults, pre-deployment validation (cfn-lint, cfn-guard, change sets),... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-cloudformation/SKILL.md) |
| **`aws-compute`** | "Provisions, scales, and operates Amazon EC2 virtual-machine workloads: instance-type selection (Graviton/Arm64, burstable T credits, GPU, instance store vs EBS), launch templat... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-compute/SKILL.md) |
| **`aws-containers`** | Builds and deploys containerized workloads on Elastic Kubernetes Service (EKS), Elastic Container Service (ECS), Fargate, and ECR (Elastic Container Registry). Covers general EK... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-containers/SKILL.md) |
| **`aws-database`** | "Routes any task involving AWS databases — choosing, comparing, recommending, getting started with, or operating a database — to the correct service-specific skill. Supersedes g... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-database/SKILL.md) |
| **`aws-deployment`** | "Configures CI/CD pipelines using AWS CodePipeline, CodeBuild, CodeDeploy, CodeConnections, and CodeArtifact. Covers CodePipeline V2 (triggers, variables, execution modes, cross... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-deployment/SKILL.md) |
| **`aws-iam`** | > Provides verified corrections for IAM behaviors that AI agents frequently get wrong — policy evaluation edge cases, trust policy gotchas, STS session limits, Organizations qui... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-iam/SKILL.md) |
| **`aws-messaging-and-streaming`** | Guides general use of AWS messaging and streaming services. Covers Amazon SQS, Amazon SNS, Amazon EventBridge, Amazon MQ, Amazon Kinesis Data Streams, Amazon Data Firehose, Amaz... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-messaging-and-streaming/SKILL.md) |
| **`aws-networking`** | "Routes AWS networking requests to the correct service skill for implementation. Covers Route 53 (DNS, health checks, routing policies, Resolver, DNS Firewall), CloudFront (cach... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-networking/SKILL.md) |
| **`aws-observability`** | Builds, configures, debugs, and optimizes AWS observability with CloudWatch (Log Insights, Metrics, Alarms, Dashboards, EMF), X-Ray, CloudTrail, and ADOT (AWS Distro for OpenTel... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-observability/SKILL.md) |
| **`aws-sdk-js-v3-usage`** | AWS SDK for JavaScript v3 development patterns. Use when writing JavaScript or TypeScript code that uses AWS services via @aws-sdk/* packages (aws-sdk-js-v3), or when asked abou... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-sdk-js-v3-usage/SKILL.md) |
| **`aws-sdk-python-usage`** | AWS SDK for Python (boto3/botocore) development patterns. You MUST use this skill when writing Python code that uses AWS services via boto3 or botocore. This includes creating s... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-sdk-python-usage/SKILL.md) |
| **`aws-sdk-swift-usage`** | AWS SDK for Swift development patterns. Use when writing Swift code that uses AWS services via aws-sdk-swift package. | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-sdk-swift-usage/SKILL.md) |
| **`aws-secrets-manager`** | > Secret safety for AWS Secrets Manager, secret management, credentials, API keys, tokens, and passwords. Prevents AI agents from directly fetching secret values and teaches run... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-secrets-manager/SKILL.md) |
| **`aws-security`** | "Covers AWS security services and workflows — Security Hub V2 (OCSF) findings, connectors, aggregators, automation rules, and security posture summaries; Security Hub CSPM (V1/A... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-security/SKILL.md) |
| **`aws-serverless`** | Builds, deploys, manages, debugs, configures, and optimizes serverless applications on AWS using Lambda, API Gateway, Step Functions, EventBridge, and SAM/CDK. Covers cold start... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-serverless/SKILL.md) |
| **`aws-storage`** | "Selects, investigates, and compares AWS object, file, and block storage services, and answers cost, performance, configuration, security, and troubleshooting questions about st... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/aws-storage/SKILL.md) |
| **`launch-with-aws`** | "Migrates vibe-coded web applications to AWS. Handles the full workflow from analysis through migration to deployment, producing deployable AWS Blocks infrastructure code. Suppo... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/launch-with-aws/SKILL.md) |
| **`signing-in-to-aws`** | Gets AWS credentials for CLI/SDK access via `aws login`. Activates when a developer needs to authenticate to AWS for local development, when an AWS operation fails due to missin... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/aws-core/ed19c44c46c9c3a12ef0ff5bbf88161b75d3efbe/skills/signing-in-to-aws/SKILL.md) |

## 6. Context Compression & Token Mode Skills (Cache & Marketplace) (14 skills)

| Skill Name | Trigger / Purpose | File Link |
| :--- | :--- | :--- |
| **`context-mode`** | Use context-mode tools (ctx_execute, ctx_execute_file) instead of Bash/cat when processing large outputs. Triggers: "analyze logs", "summarize output", "process data", "parse JS... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/context-mode/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/context-mode/SKILL.md) |
| **`context-mode`** | Use context-mode tools (ctx_execute, ctx_execute_file) instead of Bash/cat when processing large outputs. Triggers: "analyze logs", "summarize output", "process data", "parse JS... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/marketplaces/github.com/mksglu/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/context-mode/SKILL.md) |
| **`context-mode-ops`** | Manage context-mode GitHub issues, PRs, releases, and marketing with parallel subagent army. Orchestrates 10-20 dynamic agents per task. Use when triaging issues, reviewing PRs,... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/context-mode/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/.claude/skills/context-mode-ops/SKILL.md) |
| **`context-mode-ops`** | Manage context-mode GitHub issues, PRs, releases, and marketing with parallel subagent army. Orchestrates 10-20 dynamic agents per task. Use when triaging issues, reviewing PRs,... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/marketplaces/github.com/mksglu/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/.claude/skills/context-mode-ops/SKILL.md) |
| **`ctx-doctor`** | Run context-mode diagnostics. Checks runtimes, hooks, FTS5, plugin registration, npm and marketplace versions. Trigger: /context-mode:ctx-doctor | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/context-mode/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/ctx-doctor/SKILL.md) |
| **`ctx-doctor`** | Run context-mode diagnostics. Checks runtimes, hooks, FTS5, plugin registration, npm and marketplace versions. Trigger: /context-mode:ctx-doctor | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/marketplaces/github.com/mksglu/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/ctx-doctor/SKILL.md) |
| **`ctx-insight`** | Open the context-mode Insight analytics dashboard in the browser. Shows personal metrics: session activity, tool usage, error rate, parallel work patterns, project focus, and ac... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/context-mode/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/ctx-insight/SKILL.md) |
| **`ctx-insight`** | Open the context-mode Insight analytics dashboard in the browser. Shows personal metrics: session activity, tool usage, error rate, parallel work patterns, project focus, and ac... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/marketplaces/github.com/mksglu/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/ctx-insight/SKILL.md) |
| **`ctx-purge`** | Purge the context-mode knowledge base. Permanently deletes all indexed content and resets session stats. This is destructive and cannot be undone. Trigger: /context-mode:ctx-purge | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/context-mode/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/ctx-purge/SKILL.md) |
| **`ctx-purge`** | Purge the context-mode knowledge base. Permanently deletes all indexed content and resets session stats. This is destructive and cannot be undone. Trigger: /context-mode:ctx-purge | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/marketplaces/github.com/mksglu/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/ctx-purge/SKILL.md) |
| **`ctx-stats`** | Show how much context window context-mode saved this session. Displays token consumption, context savings ratio, and per-tool breakdown. Read-only — shows stats only, no reset c... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/context-mode/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/ctx-stats/SKILL.md) |
| **`ctx-stats`** | Show how much context window context-mode saved this session. Displays token consumption, context savings ratio, and per-tool breakdown. Read-only — shows stats only, no reset c... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/marketplaces/github.com/mksglu/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/ctx-stats/SKILL.md) |
| **`ctx-upgrade`** | Update context-mode from GitHub and fix hooks/settings. Pulls latest, builds, installs, updates npm global, configures hooks. Trigger: /context-mode:ctx-upgrade | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/context-mode/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/ctx-upgrade/SKILL.md) |
| **`ctx-upgrade`** | Update context-mode from GitHub and fix hooks/settings. Pulls latest, builds, installs, updates npm global, configures hooks. Trigger: /context-mode:ctx-upgrade | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/marketplaces/github.com/mksglu/context-mode/276c2ad9136c2edd7c8f8ec84c7b5c185358c71f/skills/ctx-upgrade/SKILL.md) |

## 7. Developer & Observability Marketplace Skills (3 skills)

| Skill Name | Trigger / Purpose | File Link |
| :--- | :--- | :--- |
| **`1password-environments`** | Manage 1Password Developer Environments via the bundled MCP server. Use when creating, importing, or mounting .env files; listing Environment variable names; adding or updating ... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/1password/c2fa4fc23b7c83ef37116e9bad99bc782454a8c8/skills/1password-environments/SKILL.md) |
| **`grafana-assistant-cli`** | Use the grafana-assistant CLI to interact with Grafana Assistant via A2A API. Covers installation, configuration, prompting, keeping conversation context, and practical patterns... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/grafana-assistant/0d0526a92f5e5546bdd9e84390100766cc61298f/skills/grafana-assistant-cli/SKILL.md) |
| **`pagerduty-mcp-setup`** | REQUIRED setup for how to use the PagerDuty MCP server. IMPORTANT If you want to use PagerDuty MCP tools, read these instructions BEFORE checking tool schemas or doing any Pager... | [`SKILL.md`](system-specs/custom-configs/sand-data/plugins/cache/cursor-public/pagerduty/561df5e3e98d3134af17aad00030ffe7d9ea6df2/skills/pagerduty-mcp-setup/SKILL.md) |

## 8. Playwright & Browser Automation Skills (3 skills)

| Skill Name | Trigger / Purpose | File Link |
| :--- | :--- | :--- |
| **`playwright-cli`** | Automate browser interactions, test web pages, and work with Playwright tests via CLI (`open`, `goto`, `click`, `fill`, `snapshot`, `find`, `eval`, `dialog-accept`). | [`SKILL.md`](usr-local-lib/sand-playwright-mcp/aa43ec0c20ccdeae1b1193f675c547d3/node_modules/playwright-core/lib/tools/skills/playwright-cli/SKILL.md) |
| **`playwright-component-testing`** | Set up component testing with Playwright using a story gallery page driven by the built-in mount fixture for React and Vue components in isolation without dedicated runtimes. | [`SKILL.md`](usr-local-lib/sand-playwright-mcp/aa43ec0c20ccdeae1b1193f675c547d3/node_modules/playwright-core/lib/tools/skills/playwright-component-testing/SKILL.md) |
| **`playwright-trace`** | Inspect Playwright trace files from the command line — list actions, view requests, console logs, errors, snapshots, and screenshots without opening a browser. | [`SKILL.md`](usr-local-lib/sand-playwright-mcp/aa43ec0c20ccdeae1b1193f675c547d3/node_modules/playwright-core/lib/tools/skills/playwright-trace/SKILL.md) |


