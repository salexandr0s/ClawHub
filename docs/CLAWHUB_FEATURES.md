# ClawHub Feature Documentation

> Complete documentation of ClawHub capabilities and feature recommendations

## Overview

**ClawHub** is a local-first multi-agent orchestration platform built on the OpenClaw framework. It provides a comprehensive web-based UI for managing AI agents, work orders, approvals, and system operations.

**Architecture:**
- Next.js web application with React 19
- SQLite database with WAL mode (local-first)
- OpenClaw CLI integration via spawn-based command execution
- Real-time streaming via Server-Sent Events (SSE)
- Governor policy engine for risk management

---

## Current Features

### 1. Dashboard (`/now`)

**Purpose:** Real-time operational overview

**Capabilities:**
- View active work orders count and status
- See pending approvals requiring attention
- Activity feed showing recent system events
- System stats summary:
  - Gateway status (online/offline/latency)
  - Active agents count
  - Session completions

**CLI Wrapped:** `openclaw gateway status --json`

---

### 2. Work Orders (`/work-orders`)

**Purpose:** Feature and task tracking with project management

**Capabilities:**
- **Create work orders** with:
  - Title and goal (Markdown editor)
  - Priority levels: P0 (critical), P1 (high), P2 (medium), P3 (low)
  - Owner assignment (user or agent)
- **State machine workflow:**
  ```
  planned → active → blocked → review → shipped/cancelled
  ```
- **Kanban board view** for visual workflow
- **Table view** with filtering by state/priority/owner
- **Operation tracking:**
  - Break work orders into operations by station
  - Stations: spec, build, qa, ops, review, ship, compound
  - Assign operations to agents
- **Block/unblock** with reason tracking
- **Archive/delete** work orders
- Progress tracking (operations count)

**CLI Wrapped:** Internal state management (no direct CLI)

---

### 3. Approvals (`/approvals`)

**Purpose:** Policy-enforced action gates

**Capabilities:**
- View pending approvals with context
- **Approval types:**
  - `ship_gate` - Work order shipping
  - `risky_action` - Dangerous operations
  - `scope_change` - Permission changes
  - `cron_change` - Scheduled job modifications
  - `external_side_effect` - External system changes
- **Typed confirmation interface:**
  - CONFIRM mode: Type "CONFIRM"
  - WO_CODE mode: Type work order code
- Batch approval/rejection
- Markdown question/context display
- Links to related work orders

**CLI Wrapped:** `openclaw approvals get|set`

---

### 4. Console (`/console`)

**Purpose:** Operator → Agent chat interface

**Capabilities:**
- List active agent sessions
- Send messages to agents
- View message history
- Real-time message streaming
- Session state tracking (active, idle, error)
- Gateway availability detection

**CLI Wrapped:**
- `openclaw sessions sync` - List sessions
- `openclaw console send` - Send messages
- Session history retrieval

---

### 5. Agents (`/agents`)

**Purpose:** Agent lifecycle management

**Capabilities:**
- **Create agents** with:
  - Name, role, station
  - LLM model selection (Claude Sonnet, Haiku, etc.)
  - WIP (Work In Progress) limits
  - Custom avatar upload
- **Capabilities configuration:**
  - read_code, write_code, run_tests
  - deploy, review, git
  - database, api
- **Agent operations:**
  - Provision with OpenClaw gateway
  - Test with sample messages
  - View sessions and heartbeat status
  - Sync with gateway

**CLI Wrapped:**
- Agent creation/provisioning
- `openclaw agents list`
- Capability probing

---

### 6. Agent Templates (`/agent-templates`)

**Purpose:** Parameterized agent creation

**Capabilities:**
- Browse template library
- Create agents from templates with parameter substitution
- Import templates from ZIP archives
- Export templates as ZIP
- Template validation
- Use templates for quick agent spawning

**CLI Wrapped:** Filesystem operations

---

### 7. Skills (`/skills`)

**Purpose:** Skill management for agents

**Capabilities:**
- **Scope types:**
  - Global (shared across all agents)
  - Agent-scoped (specific to one agent)
- **YAML editor** for skill definition
- **Validation engine:**
  - Syntax checking
  - Configuration validation
- Enable/disable individual skills
- **Duplicate skills** across scopes (global ↔ agent)
- Export skills as ZIP
- Usage tracking

**CLI Wrapped:**
- `openclaw skills list`
- `openclaw skills check` (validation)
- `openclaw skills info`

---

### 8. Plugins (`/plugins`)

**Purpose:** Plugin ecosystem management

**Capabilities:**
- Browse installed plugins
- **Source types:**
  - Local filesystem
  - npm packages
  - Tarball archives
  - Git repositories
- **Plugin operations:**
  - Install/uninstall
  - Enable/disable (without uninstalling)
  - Restart to apply config changes
  - View status (active, inactive, error, updating)
- **Plugin Doctor:**
  - Health check diagnostics
  - Configuration validation
  - Auto-fix capability
- Configuration editor with JSON schema validation
- Error logging

**CLI Wrapped:**
- `openclaw plugins list`
- `openclaw plugins info`
- `openclaw plugins install`
- `openclaw plugins enable|disable`
- `openclaw plugins doctor`

---

### 9. Cron Jobs (`/cron`)

**Purpose:** Scheduled task management

**Capabilities:**
- Browse scheduled jobs
- **Human-readable schedule display:**
  - Parses cron expressions: "Every 30 min", "Daily 3:00 PM"
  - Interval-based schedules
  - One-time schedules
- Enable/disable jobs (with typed confirmation)
- **Run jobs immediately** (on-demand execution)
- View execution status:
  - Last status (success/failed/running)
  - Run count
  - Last run timestamp

**CLI Wrapped:**
- `openclaw cron list`
- `openclaw cron status`
- `openclaw cron enable|disable`
- `openclaw cron run <id>`

---

### 10. Workspace Browser (`/workspace`)

**Purpose:** OpenClaw workspace filesystem navigation

**Capabilities:**
- Browse workspace directories:
  - `agents/`
  - `skills/`
  - `playbooks/`
  - `plugins/`
  - `overlays/`
- Path safety validation (no `..` traversal)
- File viewing (read-only, limited scope)

**CLI Wrapped:** Filesystem operations with safety checks

---

### 11. Operations/Receipts (`/runs`)

**Purpose:** Command execution logs

**Capabilities:**
- View command execution receipts
- Filter by status (success, failed, running)
- View stdout/stderr excerpts
- Receipt streaming for long-running commands
- Receipt finalization tracking

**CLI Wrapped:** Internal receipt system

---

### 12. Maintenance (`/maintenance`)

**Purpose:** System health and diagnostics

**Capabilities:**
- **Health Check:** Verify services and connections
- **Doctor diagnostics:**
  - Plugin status checks
  - Configuration validity
  - Skill validation
  - Auto-fix capability
  - Detailed check results
- **Recovery workflows:** Full playbook-based recovery
- **Cache Management:** Clear all caches
- **Session Reset:** Disconnect all agents
- **Gateway Restart:** Restart OpenClaw service

**CLI Wrapped:**
- `openclaw health`
- `openclaw doctor`
- `openclaw doctor --fix`
- `openclaw gateway restart`

---

### 13. Security (`/security`)

**Purpose:** Security audits and compliance

**Capabilities:**
- **Run Audit:** Basic security scan
- **Deep Audit:** Comprehensive scan with Gateway probe
- **Apply Fixes:** Auto-fix file permissions and config
- **Audit findings display:**
  - Severity cards (critical, warning, info)
  - Expandable finding details
  - Check ID references
- **Gateway probe results:**
  - Connectivity status
  - URL validation
  - Error reporting
- **Fix actions panel:**
  - Config changes applied
  - Permission changes with octal modes
  - Error reporting
- **Create Work Order** from audit findings
- **Recommendations checklist** based on findings

**CLI Wrapped:**
- `openclaw security audit`
- `openclaw security audit --deep`
- `openclaw security audit --fix`

---

### 14. Models (`/models`)

**Purpose:** AI model provider management

**Capabilities:**
- View available models by provider
- Check authentication status per provider
- Model configuration interface

**CLI Wrapped:**
- `openclaw models list`
- `openclaw models status`

---

### 15. Gateway Live (`/gateway-live`)

**Purpose:** Real-time graph visualizer

**Capabilities:**
- **"Crabwalk" visualization** of live OpenClaw activity
- Shows:
  - Agent sessions as nodes
  - Tool calls and messages as edges
  - Subagent spawns
- Real-time graph updates via WebSocket (delta streaming)
- Filtering by agent/session
- Capped snapshots (500 nodes, 800 edges max)

**CLI Wrapped:** WebSocket connection to OpenClaw gateway

---

### 16. Activity Timeline (`/live`)

**Purpose:** Real-time event stream

**Capabilities:**
- Chronological activity feed via SSE
- **Activity types:**
  - work_order, operation
  - agent, system
  - approval, cron
  - gateway, receipt
- Real-time updates
- Filter by activity type
- Auto-scroll "tail mode"
- Event icons and actor badges
- Visualizer view (graph-based)

**CLI Wrapped:** SSE streaming from gateway

---

### 17. Settings (`/settings`)

**Purpose:** User preferences and configuration

**Capabilities:**
- **Workspace Configuration:** Set OpenClaw workspace path
- **Layout Modes:**
  - Auto-detect screen orientation
  - Horizontal (wide screens)
  - Vertical (portrait/mobile)
- **Themes:**
  - Dark (high contrast)
  - Dim (comfortable)
- **Display Density:** Compact or default spacing
- **Power User Options:** Skip typed confirmation (demo mode)

**CLI Wrapped:** Configuration file management

---

## Governor System (Cross-Cutting)

The Governor is the centralized policy engine controlling "dangerous" operations:

### Risk Levels
- **safe:** No confirmation required
- **caution:** Standard confirmation
- **danger:** Typed confirmation required

### Confirmation Modes
- **NONE:** Auto-approve
- **CONFIRM:** Type "CONFIRM"
- **WO_CODE:** Type work order code

### Protected Actions (50+)
| Category | Actions |
|----------|---------|
| Work Orders | ship, cancel, delete |
| Plugins | install, uninstall, enable, disable, restart, doctor, edit config |
| Skills | install, uninstall, enable, disable, duplicate |
| Agents | create, provision, test, edit |
| Gateway | restart, shutdown |
| Maintenance | health check, cache clear, sessions reset, recover |
| Cron | enable, disable, run now |
| Templates | import, export, delete, use |
| Approvals | approve, reject |

### Audit Trail
- All protected actions logged with:
  - Timestamp
  - Actor (user/agent)
  - Entity affected
  - Payload details
  - Receipt ID

---

## Database Schema

| Table | Purpose |
|-------|---------|
| WorkOrder | Projects with code, state, priority, owner |
| Operation | Tasks within work orders (assigned to agents) |
| Agent | Agent profiles with model, role, capabilities |
| AgentSession | Real-time telemetry from OpenClaw |
| Approval | Policy-enforced action gates |
| Activity | Audit log of all events |
| Receipt | Command execution records with stdout/stderr |
| Artifact | Generated outputs (PRs, docs, files, screenshots) |
| Message | Chat history |
| Skill | Skill definitions (global and agent-scoped) |
| Plugin | Plugin metadata |
| CronJob | Scheduled job definitions |

---

## API Structure

All APIs under `/api/`:

| Category | Endpoints |
|----------|-----------|
| Work Orders | `/work-orders`, `/work-orders/[id]` |
| Operations | `/operations`, `/operations/[id]` |
| Agents | `/agents`, `/agents/[id]`, `/agents/[id]/avatar`, `/agents/[id]/provision`, `/agents/[id]/test` |
| Approvals | `/approvals`, `/approvals/[id]`, `/approvals/batch` |
| Activities | `/activities` |
| Receipts | `/receipts/[id]`, `/receipts/[id]/append`, `/receipts/[id]/finalize` |
| OpenClaw | `/openclaw/gateway/status`, `/openclaw/cron/*`, `/openclaw/console/*`, `/openclaw/agents/sync`, `/openclaw/capabilities`, `/openclaw/sessions/sync` |
| Streaming | `/stream/openclaw`, `/stream/activities`, `/stream/receipts/[id]` |
| Skills | `/skills`, `/skills/[scope]/[id]`, `/skills/[scope]/[id]/validate`, `/skills/[scope]/[id]/duplicate` |
| Plugins | `/plugins`, `/plugins/[id]/doctor`, `/plugins/[id]/config`, `/plugins/restart` |
| Maintenance | `/maintenance`, `/maintenance/[action]`, `/maintenance/recover` |
| Models | `/models` |
| Config | `/config/env` |
| Search | `/search` |
| Workspace | `/workspace`, `/workspace/[id]` |

---

## Demo vs Operational Mode

| Mode | Behavior |
|------|----------|
| **Demo** (OpenClaw not on PATH) | Mock data for all features; simulated command execution; full UI functionality |
| **Operational** (OpenClaw installed) | Real CLI integration; real workspace interaction; real agent orchestration; approval gates enforced |

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19.2.4, Next.js 16.1.6, TailwindCSS, Lucide icons, Geist fonts |
| Backend | Next.js API routes, Prisma ORM, SQLite + WAL |
| CLI Integration | spawn() with array args (no shell) |
| Real-time | EventSource (SSE), WebSocket (gateway) |
| Monorepo | Turbo, npm workspaces, TypeScript 5.4 |
