# ClawHub Feature Recommendations

> OpenClaw capabilities that could be implemented as actionable UI features

Based on analysis of the [OpenClaw documentation](https://docs.openclaw.ai/) and [GitHub repository](https://github.com/openclaw/openclaw), here are features that could enhance ClawHub with well-presented, actionable button interfaces similar to the Security page.

---

## Priority 1: High-Impact Terminal Commands → UI

These are frequently-used CLI commands that would benefit most from a visual interface with actionable buttons and well-presented results.

### 1. System Status Dashboard (`/status`)

**CLI Commands:**
```bash
openclaw status --all          # Full debug report
openclaw status --usage        # Provider usage breakdown
openclaw health --verbose      # Deep health check
openclaw gateway status        # Gateway state
```

**Proposed UI:**
| Button | Action | Display |
|--------|--------|---------|
| "Full Status Report" | Run `openclaw status --all` | Pasteable debug report in code block |
| "Check Health" | Run `openclaw health --verbose` | Health check cards with status indicators |
| "Usage Summary" | Run `openclaw status --usage` | Provider usage table with quotas and costs |
| "Refresh All" | Run all three in parallel | Combined dashboard view |

**Display Elements:**
- Gateway status card (connected/disconnected, latency, version)
- Provider auth status cards (per provider with API mode, base URL)
- Token usage bar charts (per provider)
- Active sessions count
- Memory index status
- Recent errors (last 5)

**Risk Level:** safe (read-only)

---

### 2. Doctor & Diagnostics (`/doctor`)

**CLI Commands:**
```bash
openclaw doctor                # Identify issues
openclaw doctor --fix          # Auto-fix issues
openclaw doctor --verbose      # Detailed output
```

**Proposed UI (similar to Security page pattern):**

| Button | Action | Confirmation |
|--------|--------|--------------|
| "Run Doctor" | `openclaw doctor` | None |
| "Run Verbose" | `openclaw doctor --verbose` | None |
| "Apply Fixes" | `openclaw doctor --fix` | Type CONFIRM |

**Display Elements:**
- Check cards showing: ✅ Passed, ⚠️ Warning, ❌ Failed
- Expandable details per check
- "Backup created at ~/.openclaw/openclaw.json.bak" notice when fixing
- List of removed/fixed config keys
- Recommended actions for manual fixes

**Categories to display:**
- Plugin health checks
- Config validation
- Permissions checks
- Channel connectivity
- Memory index status
- Keychain/OAuth status

---

### 3. Model Management (`/models`) - Enhanced

**CLI Commands:**
```bash
openclaw models list           # Available models
openclaw models status         # Current config + auth
openclaw models status --probe # Live auth check (uses tokens!)
openclaw models set <model>    # Change default model
openclaw aliases list|add|remove
openclaw fallbacks list|add|remove|clear
```

**Proposed UI Enhancement:**

| Button | Action | Display |
|--------|--------|---------|
| "List Models" | `openclaw models list` | Grid of available models with provider badges |
| "Check Status" | `openclaw models status` | Current model + fallback chain |
| "Probe Auth" | `openclaw models status --probe` | Live auth test with ⚠️ "uses tokens" warning |
| "Set Default" | `openclaw models set` | Modal with model picker |

**New Sections:**
- **Aliases Manager:** Table of aliases with add/remove buttons
- **Fallback Chain:** Visual chain diagram with drag-to-reorder
- **Image Model Fallbacks:** Separate section for image generation

**Display per model:**
- Provider logo/badge
- Model name and ID
- Context window size
- Auth status (✅ configured, ❌ missing)
- Cost tier indicator

---

### 4. Browser Control (`/browser`)

**CLI Commands:**
```bash
openclaw browser status        # Browser state
openclaw browser start         # Start browser instance
openclaw browser stop          # Stop browser
openclaw browser tabs          # List open tabs
openclaw browser navigate <url>
openclaw browser screenshot    # Capture screenshot
openclaw browser snapshot      # DOM snapshot with refs
openclaw browser reset-profile # Reset browser profile
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "Browser Status" | `openclaw browser status` | Status card (running/stopped, profile info) |
| "Start Browser" | `openclaw browser start` | Success toast |
| "Stop Browser" | `openclaw browser stop` | Confirmation modal |
| "List Tabs" | `openclaw browser tabs` | Tab cards with title, URL, targetId |
| "Take Screenshot" | `openclaw browser screenshot` | Display captured image |
| "Get Snapshot" | `openclaw browser snapshot` | Interactive element reference viewer |
| "Reset Profile" | `openclaw browser reset-profile` | Type CONFIRM |

**Tab Actions (per tab):**
- Focus tab
- Close tab
- Navigate to URL
- Screenshot this tab

---

### 5. Memory Management (`/memory`)

**CLI Commands:**
```bash
openclaw memory status         # Index status
openclaw memory index          # Trigger re-index
openclaw memory search <query> # Search memory
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "Memory Status" | `openclaw memory status` | Index stats (files, chunks, last sync) |
| "Rebuild Index" | `openclaw memory index` | Progress bar with streaming output |
| "Search" | Input + `openclaw memory search` | Search results with file previews |

**Display Elements:**
- File count indexed
- Total chunks
- Last update timestamp
- Backend type (SQLite/QMD)
- Indexed paths list
- Search results with relevance scores

---

### 6. Sandbox/Container Management (`/sandbox`)

**CLI Commands:**
```bash
openclaw sandbox list          # List containers
openclaw sandbox recreate      # Recreate containers
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "List Sandboxes" | `openclaw sandbox list` | Container cards with status |
| "Recreate" | `openclaw sandbox recreate <id>` | Type CONFIRM, show progress |
| "Recreate All" | Recreate all sandboxes | Type CONFIRM |

**Per-container display:**
- Container ID
- Agent association
- Status (running/stopped/error)
- Last used timestamp
- Resource usage

---

### 7. Channels Management (`/channels`)

**CLI Commands:**
```bash
openclaw channels list         # All channels
openclaw channels status       # Per-channel health
openclaw channels logs <channel>
openclaw channels add
openclaw channels remove
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "List Channels" | `openclaw channels list` | Channel cards with icons |
| "Check All" | `openclaw channels status` | Health status per channel |
| "View Logs" | `openclaw channels logs` | Log viewer modal |
| "Add Channel" | Wizard | Multi-step setup form |
| "Remove" | Per-channel | Type CONFIRM |

**Supported Channels Display:**
- WhatsApp, Telegram, Slack, Discord
- Google Chat, Signal, iMessage
- Microsoft Teams, Matrix
- Zalo, WebChat

**Per-channel:**
- Connection status
- DM policy settings
- Allowlist summary
- Recent message count
- Error count

---

### 8. Nodes/Devices (`/nodes`)

**CLI Commands:**
```bash
openclaw nodes                 # List connected nodes
openclaw devices               # List paired devices
openclaw node status <id>      # Node status
openclaw node install|uninstall|start|stop|restart
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "List Nodes" | `openclaw nodes` | Device cards with type icons |
| "List Devices" | `openclaw devices` | Paired devices table |
| "Node Status" | Per-node | Status modal with capabilities |
| "Restart Node" | Per-node | Confirmation |
| "Approve Pairing" | Pending pairings | Approval modal |

**Node types display:**
- macOS (menu bar app)
- iOS (Bridge connection)
- Android (Bridge connection)
- Headless server

**Per-node capabilities:**
- Canvas, Camera, Screen capture
- Location, SMS (Android)
- Voice Wake (macOS/iOS/Android)

---

### 9. Logs Viewer (`/logs`)

**CLI Commands:**
```bash
openclaw logs --follow         # Live tail
openclaw logs --tail 300       # Last N lines
openclaw gateway logs          # Gateway-specific
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "View Logs" | `openclaw logs --tail 300` | Scrollable log viewer |
| "Follow Mode" | `openclaw logs --follow` | Live streaming log tail |
| "Gateway Logs" | `openclaw gateway logs` | Filtered gateway logs |
| "Export Logs" | Download | .log file download |

**Features:**
- Log level filtering (debug, info, warn, error)
- Search within logs
- Timestamp filtering
- Auto-scroll toggle
- Syntax highlighting for JSON

---

### 10. Webhooks/Hooks (`/hooks`)

**CLI Commands:**
```bash
openclaw hooks list            # List hooks
openclaw hooks enable <name>
openclaw hooks disable <name>
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "List Hooks" | `openclaw hooks list` | Hook cards with status |
| "Enable" | Per-hook | Toggle switch |
| "Disable" | Per-hook | Toggle switch |
| "Test Hook" | Send test payload | Response preview |

**Display:**
- Hook name
- Event type (command:new, command:reset, agent:bootstrap)
- Status (enabled/disabled)
- Plugin association (if managed by plugin)
- Last triggered timestamp

**Webhook Configuration:**
- Endpoint URL display
- Token status
- Wake mode options
- Delivery channel options

---

## Priority 2: Security & Audit Features

### 11. Allowlist Manager (`/security/allowlist`)

**CLI Commands:**
```bash
openclaw allowlist add <binary>
openclaw allowlist remove <binary>
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "View Allowlist" | Read config | Table of allowed binaries |
| "Add Binary" | Modal input | Add to allowlist |
| "Remove" | Per-item | Remove from allowlist |
| "Reset to Default" | Restore defaults | Type CONFIRM |

**Display:**
- Category grouping (file inspection, text processing, system info, etc.)
- Custom additions highlighted
- Per-binary documentation

---

### 12. Exec Approvals Manager (`/security/exec`)

**CLI Commands:**
```bash
openclaw approvals get
openclaw approvals set <mode>
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "Get Current Mode" | `openclaw approvals get` | Current mode badge |
| "Set Ask Mode" | Set exec approvals | Radio buttons |
| "Set Full Mode" | Set exec approvals | Radio buttons |
| "View Pending" | List pending approvals | Approval cards |

**Modes explained:**
- "ask" - Host exec with approval prompts
- "full" - Auto-approve (dangerous!)

---

### 13. Secret Scanner (`/security/secrets`)

**CLI Commands:**
```bash
detect-secrets scan
detect-secrets audit
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "Scan for Secrets" | `detect-secrets scan` | Findings table |
| "Audit Baseline" | Interactive review | Checklist UI |
| "Update Baseline" | After marking false positives | Confirmation |

**Display:**
- File path
- Line number
- Secret type detected
- False positive checkbox
- "Rotate this secret" button

---

## Priority 3: Agent Lifecycle Enhancements

### 14. Subagents Management (`/agents/subagents`)

**Slash Commands → UI:**
```
/subagents list
/subagents stop <id>
/subagents log <id>
/subagents info <id>
/subagents send <id> <message>
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "List Subagents" | `/subagents list` | Subagent cards |
| "Stop" | Per-subagent | Type CONFIRM |
| "View Log" | Per-subagent | Log modal |
| "Send Message" | Per-subagent | Chat input |

---

### 15. Session Management Enhanced

**Slash Commands → UI:**
```
/status         # Session status
/new            # Reset session
/reset          # Reset session
/model <model>  # Change model
/think <level>  # Set thinking level
/verbose on|off # Toggle verbose
/context list   # Context breakdown
/usage cost     # Cost summary
```

**Proposed UI (per session):**

| Button | Action | Display |
|--------|--------|---------|
| "Session Status" | `/status` | Status card with model, tokens, cost |
| "Reset Session" | `/new` | Type CONFIRM |
| "Change Model" | `/model` | Model picker dropdown |
| "Set Thinking" | `/think` | Level slider (off→xhigh) |
| "Toggle Verbose" | `/verbose` | Toggle switch |
| "View Context" | `/context detail` | Context breakdown pie chart |
| "Cost Summary" | `/usage cost` | Cost table by session |

---

## Priority 4: Configuration Management

### 16. Configuration Editor (`/config`)

**CLI Commands:**
```bash
openclaw config get <key>
openclaw config set <key> <value>
openclaw config unset <key>
openclaw configure             # Interactive wizard
```

**Proposed UI:**

| Section | Display | Actions |
|---------|---------|---------|
| Agents | Model, sandbox, WIP defaults | Edit form |
| Channels | Per-channel config | Toggle, edit |
| Tools | Allow/deny lists, profiles | Checkbox editor |
| Memory | Backend, paths, intervals | Form |
| Hooks | Enabled, token | Toggle, input |
| Logging | Level, file path | Dropdown |

**Features:**
- Config validation before save
- Backup before changes
- Diff view of changes
- Reset to defaults button

---

### 17. Pairing/Auth Manager (`/auth`)

**CLI Commands:**
```bash
openclaw auth add              # Add provider
openclaw auth setup-token      # Setup token auth
openclaw auth paste-token      # Paste existing token
openclaw auth order get|set|clear
openclaw pairing approve <channel> <code>
```

**Proposed UI:**

| Button | Action | Display |
|--------|--------|---------|
| "Add Provider" | Wizard | Multi-step auth setup |
| "View Auth Order" | `auth order get` | Ordered list of providers |
| "Reorder" | Drag and drop | Provider priority |
| "Approve Pairing" | Pending codes | Approval form |

---

## Implementation Pattern

Following the Security page pattern (`/security`):

### UI Structure
```tsx
<PageHeader title="..." subtitle="..." />

{/* Action Buttons Row */}
<div className="flex flex-wrap gap-3">
  <Button variant="primary" onClick={runPrimary}>
    <Play /> Primary Action
  </Button>
  <Button variant="secondary" onClick={runSecondary}>
    <Zap /> Secondary Action
  </Button>
  <Button variant="warning" onClick={runDangerous} disabled={!ready}>
    <Wrench /> Dangerous Action
  </Button>
</div>

{/* Receipt ID */}
{receiptId && <ReceiptBadge id={receiptId} />}

{/* Results Display */}
{results && (
  <>
    <SummaryCards data={results.summary} />
    <StatusBanner status={results.status} />
    <DetailSections data={results.details} />
    <RecommendationsList items={results.recommendations} />
  </>
)}

{/* Empty State */}
{!results && !loading && <EmptyState />}

{/* Loading State */}
{loading && <LoadingState message="Running..." />}

{/* Confirm Modal */}
<TypedConfirmModal ... />
```

### API Pattern
```ts
// POST /api/[feature]/[action]
// Returns: { data: ..., receiptId: string }

export async function runAction(
  type: ActionType,
  typedConfirmText?: string
): Promise<ApiResponse> {
  const receipt = await createReceipt('action.name')
  try {
    const result = await executeCliCommand(...)
    await finalizeReceipt(receipt.id, result)
    return { data: result, receiptId: receipt.id }
  } catch (err) {
    await failReceipt(receipt.id, err)
    throw err
  }
}
```

### Governor Integration
```ts
// packages/core/src/governor/definitions.ts
export const PROTECTED_ACTIONS = {
  // Add new actions:
  'browser.reset_profile': { risk: 'danger', confirm: 'CONFIRM' },
  'sandbox.recreate': { risk: 'caution', confirm: 'CONFIRM' },
  'memory.rebuild': { risk: 'caution', confirm: 'CONFIRM' },
  // ...
}
```

---

## Summary: Top 10 Most Valuable Features

| Priority | Feature | Value Proposition |
|----------|---------|-------------------|
| 1 | System Status Dashboard | Pasteable debug info, provider health |
| 2 | Doctor & Diagnostics | One-click health check with auto-fix |
| 3 | Enhanced Models | Visual model picker, fallback chains |
| 4 | Browser Control | Screenshot/snapshot buttons, tab management |
| 5 | Memory Management | Index status, search UI |
| 6 | Channels Management | Multi-channel status dashboard |
| 7 | Logs Viewer | Live tail, search, filtering |
| 8 | Nodes/Devices | Device pairing UI, node control |
| 9 | Allowlist Manager | Visual exec permission editor |
| 10 | Session Management | Per-session controls (model, thinking, cost) |

---

## Sources

- [OpenClaw Documentation](https://docs.openclaw.ai/)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw CLI Reference](https://docs.openclaw.ai/cli)
- [OpenClaw Security Guide](https://docs.openclaw.ai/gateway/security)
- [OpenClaw Slash Commands](https://docs.openclaw.ai/tools/slash-commands)
- [OpenClaw Webhooks](https://docs.openclaw.ai/automation/webhook)
- [OpenClaw Nodes](https://docs.openclaw.ai/nodes)
- [OpenClaw Memory](https://docs.openclaw.ai/concepts/memory)
- [OpenClaw Browser](https://docs.openclaw.ai/cli/browser)
