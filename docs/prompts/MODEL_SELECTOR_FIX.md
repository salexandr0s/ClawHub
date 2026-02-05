# MODEL_SELECTOR_FIX.md

## Goal
Enable model and fallback configuration for agents in ClawControl, with sync to OpenClaw config.

## Current State
- DB has `model` column on agents (schema.prisma line ~15)
- UI shows ModelBadge and has a dropdown selector in agent edit panel
- **BUT** PATCH endpoint at `app/api/agents/[id]/route.ts` doesn't extract/save `model`
- No `fallbacks` field in schema
- No sync to OpenClaw's `~/.openclaw/openclaw.json`

## Required Changes

### 1. Schema Migration
File: `apps/clawcontrol/prisma/schema.prisma`

Add fallbacks column to Agent model:
```prisma
model Agent {
  // ... existing fields ...
  model           String?   @default("claude-sonnet-4-20250514") @map("model")
  fallbacks       String?   @default("[]") @map("fallbacks") // JSON array of model IDs
  // ...
}
```

Run: `cd apps/clawcontrol && npx prisma migrate dev --name add-agent-fallbacks`

### 2. Update PATCH Endpoint
File: `apps/clawcontrol/app/api/agents/[id]/route.ts`

In the PATCH handler, add `model` and `fallbacks` to extraction:
```typescript
const { status, currentWorkOrderId, role, station, capabilities, wipLimit, sessionKey, model, fallbacks, typedConfirmText } = body
```

Add to wantsAdminEdit check:
```typescript
const wantsAdminEdit =
  role !== undefined ||
  station !== undefined ||
  capabilities !== undefined ||
  wipLimit !== undefined ||
  sessionKey !== undefined ||
  model !== undefined ||
  fallbacks !== undefined
```

Add to repos.agents.update call:
```typescript
const data = await repos.agents.update(id, {
  status,
  currentWorkOrderId,
  role,
  station,
  capabilities,
  wipLimit,
  sessionKey,
  model,
  fallbacks,
})
```

### 3. Update Agents Repository
File: `apps/clawcontrol/lib/repo/agents.ts`

Add `model` and `fallbacks` to the update method's accepted fields.

### 4. Add Fallbacks UI
File: `apps/clawcontrol/app/(dashboard)/agents/agents-client.tsx`

In the edit panel (around line 200+), add a fallbacks selector after the model selector:
- Show current fallbacks as a list of ModelBadges
- Add a dropdown to add fallbacks (exclude primary model from options)
- Allow reordering/removing fallbacks
- Store as JSON array of model IDs

### 5. Update models.ts
File: `apps/clawcontrol/lib/models.ts`

Add missing models and use full OpenClaw format:
```typescript
export const AVAILABLE_MODELS = [
  {
    id: 'anthropic/claude-opus-4-5',
    name: 'Opus 4.5',
    shortName: 'Opus',
    description: 'Most capable, complex tasks',
    color: 'progress',
  },
  {
    id: 'anthropic/claude-sonnet-4-5',
    name: 'Sonnet 4.5',
    shortName: 'Sonnet',
    description: 'Fast, balanced performance',
    color: 'info',
  },
  {
    id: 'anthropic/claude-3-5-haiku-20241022',
    name: 'Haiku 3.5',
    shortName: 'Haiku',
    description: 'Fastest, most efficient',
    color: 'success',
  },
  {
    id: 'openai-codex/gpt-5.2',
    name: 'Codex GPT-5.2',
    shortName: 'Codex',
    description: 'Code-focused (ChatGPT Plus)',
    color: 'default',
  },
  {
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2',
    shortName: 'GPT-5.2',
    description: 'OpenAI API',
    color: 'default',
  },
] as const

export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5'
```

### 6. OpenClaw Config Sync Service
File: `apps/clawcontrol/lib/services/openclaw-config.ts` (new)

Create a service that:
1. Reads current `~/.openclaw/openclaw.json`
2. Finds agent in `agents.list[]` by matching sessionKey or name
3. Updates the agent's `model.primary` and `model.fallbacks`
4. Writes back to file
5. Triggers gateway restart via `gateway.restart` API or SIGUSR1

```typescript
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

const OPENCLAW_CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json')

export async function syncAgentModelToOpenClaw(
  agentId: string,  // e.g., "savorgbuild"
  model: string,
  fallbacks: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const raw = await readFile(OPENCLAW_CONFIG_PATH, 'utf-8')
    const config = JSON.parse(raw)
    
    const agentIndex = config.agents.list.findIndex(
      (a: any) => a.id === agentId || a.name?.toLowerCase() === agentId.toLowerCase()
    )
    
    if (agentIndex === -1) {
      return { ok: false, error: `Agent ${agentId} not found in OpenClaw config` }
    }
    
    // Update model config
    config.agents.list[agentIndex].model = {
      primary: model,
      ...(fallbacks.length > 0 ? { fallbacks } : {})
    }
    
    // Write back
    await writeFile(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2))
    
    // TODO: Trigger restart via gateway API or signal
    // For now, log that restart is needed
    console.log('[openclaw-config] Config updated, gateway restart needed')
    
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}
```

### 7. Call Sync from PATCH Endpoint
After updating the database, call the sync service:

```typescript
// After repos.agents.update(...)
if (model !== undefined || fallbacks !== undefined) {
  const syncResult = await syncAgentModelToOpenClaw(
    currentAgent.sessionKey.split(':')[1], // Extract agent id from session key
    model ?? currentAgent.model,
    fallbacks ? JSON.parse(fallbacks) : []
  )
  if (!syncResult.ok) {
    console.warn('[api/agents] OpenClaw sync warning:', syncResult.error)
  }
}
```

## Testing
1. Start app: `./start.sh --web`
2. Go to Agents page
3. Edit an agent's model → verify DB updates
4. Check `~/.openclaw/openclaw.json` → model should be updated
5. Verify agent uses new model on next heartbeat

## Files to Modify
- `apps/clawcontrol/prisma/schema.prisma`
- `apps/clawcontrol/app/api/agents/[id]/route.ts`
- `apps/clawcontrol/lib/repo/agents.ts`
- `apps/clawcontrol/lib/models.ts`
- `apps/clawcontrol/app/(dashboard)/agents/agents-client.tsx`
- `apps/clawcontrol/lib/services/openclaw-config.ts` (new)
