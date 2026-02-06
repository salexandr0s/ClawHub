/**
 * OpenClaw Config Sync Service
 *
 * Syncs agent model configuration changes to the local OpenClaw config file.
 */

import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { extractAgentIdFromSessionKey, slugifyDisplayName } from '@/lib/agent-identity'

const OPENCLAW_CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json')

interface OpenClawAgent {
  id: string
  name?: string
  identity?: {
    name?: string
    emoji?: string
    description?: string
    [key: string]: unknown
  }
  model?: {
    primary?: string
    fallbacks?: string[]
  }
  [key: string]: unknown
}

interface OpenClawConfig {
  agents?: {
    list?: OpenClawAgent[]
    [key: string]: unknown
  } | OpenClawAgent[]
  [key: string]: unknown
}

export interface SyncResult {
  ok: boolean
  error?: string
  restartNeeded?: boolean
}

export interface UpsertAgentInput {
  agentId?: string | null
  runtimeAgentId?: string | null
  slug?: string | null
  displayName?: string | null
  sessionKey?: string | null
  model?: string | null
  fallbacks?: string[] | null
}

export interface UpsertAgentResult extends SyncResult {
  agentId?: string
  created?: boolean
  updated?: boolean
}

export interface RemoveAgentResult extends SyncResult {
  removed?: boolean
}

/**
 * Extract agent ID from session key
 * e.g., "agent:build-worker:main" -> "build-worker"
 */

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function resolveAgentId(input: UpsertAgentInput): string | null {
  const explicit = normalizeText(input.agentId ?? input.runtimeAgentId)
  if (explicit) return explicit

  const fromSession = extractAgentIdFromSessionKey(normalizeText(input.sessionKey))
  if (fromSession) return fromSession

  const fromSlug = normalizeText(input.slug)
  if (fromSlug) return fromSlug

  const fromDisplayName = normalizeText(input.displayName)
  if (fromDisplayName) return slugifyDisplayName(fromDisplayName)

  return null
}

function parseConfig(raw: string): OpenClawConfig {
  return JSON.parse(raw) as OpenClawConfig
}

async function loadOpenClawConfig(): Promise<{ config?: OpenClawConfig; error?: string }> {
  try {
    const raw = await readFile(OPENCLAW_CONFIG_PATH, 'utf-8')
    return { config: parseConfig(raw) }
  } catch (err) {
    const e = err as NodeJS.ErrnoException
    if (e.code === 'ENOENT') {
      return { config: {} }
    }
    return { error: `Cannot read OpenClaw config: ${err}` }
  }
}

async function saveOpenClawConfig(config: OpenClawConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    await mkdir(join(homedir(), '.openclaw'), { recursive: true })
    await writeFile(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2))
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `Cannot write OpenClaw config: ${err}` }
  }
}

function ensureAgentsList(config: OpenClawConfig): OpenClawAgent[] {
  const node = config.agents

  if (Array.isArray(node)) {
    const list = node
      .filter((v): v is OpenClawAgent => Boolean(v) && typeof v === 'object' && typeof v.id === 'string')
    config.agents = { list }
    return list
  }

  if (!node || typeof node !== 'object') {
    config.agents = { list: [] }
    return config.agents.list as OpenClawAgent[]
  }

  if (!Array.isArray(node.list)) {
    node.list = []
  }

  return node.list as OpenClawAgent[]
}

function normalizeFallbacks(fallbacks: string[] | null | undefined): string[] {
  return (fallbacks ?? [])
    .map((m) => normalizeText(m))
    .filter((m) => m.length > 0)
}

function applyModelPatch(
  existing: OpenClawAgent['model'] | undefined,
  model: string | null | undefined,
  fallbacks: string[] | null | undefined
): OpenClawAgent['model'] | undefined {
  if (model === undefined && fallbacks === undefined) {
    return existing
  }

  const next: NonNullable<OpenClawAgent['model']> = {
    ...(existing ?? {}),
  }

  if (model !== undefined) {
    const normalized = normalizeText(model)
    if (normalized) {
      next.primary = normalized
    } else {
      delete next.primary
    }
  }

  if (fallbacks !== undefined) {
    const normalized = normalizeFallbacks(fallbacks)
    if (normalized.length > 0) {
      next.fallbacks = normalized
    } else {
      delete next.fallbacks
    }
  }

  if (!next.primary && (!next.fallbacks || next.fallbacks.length === 0)) {
    return undefined
  }

  return next
}

/**
 * Ensure an agent exists in ~/.openclaw/openclaw.json under agents.list.
 * Creates or updates by agent id.
 */
export async function upsertAgentToOpenClaw(input: UpsertAgentInput): Promise<UpsertAgentResult> {
  try {
    const resolvedId = resolveAgentId(input)
    if (!resolvedId) {
      return { ok: false, error: 'Missing agent identifier' }
    }

    const loaded = await loadOpenClawConfig()
    if (!loaded.config) {
      return { ok: false, error: loaded.error ?? 'Failed to load OpenClaw config' }
    }

    const config = loaded.config
    const list = ensureAgentsList(config)
    const matchIndex = list.findIndex((a) => normalizeText(a.id).toLowerCase() === resolvedId.toLowerCase())
    const desiredModel = applyModelPatch(undefined, input.model, input.fallbacks)

    if (matchIndex === -1) {
      const newAgent: OpenClawAgent = {
        id: resolvedId,
        ...(normalizeText(input.displayName)
          ? {
              identity: {
                name: normalizeText(input.displayName),
              },
            }
          : {}),
        ...(desiredModel ? { model: desiredModel } : {}),
      }

      list.push(newAgent)
      const saved = await saveOpenClawConfig(config)
      if (!saved.ok) return { ok: false, error: saved.error }
      return { ok: true, agentId: resolvedId, created: true, updated: false, restartNeeded: true }
    }

    const current = list[matchIndex]
    const nextIdentityName = normalizeText(input.displayName)
    const nextModel = applyModelPatch(current.model, input.model, input.fallbacks)
    const updatedAgent: OpenClawAgent = {
      ...current,
      id: current.id || resolvedId,
      ...(nextIdentityName
        ? {
            identity: {
              ...(current.identity ?? {}),
              name: nextIdentityName,
            },
          }
        : {}),
      ...(nextModel ? { model: nextModel } : { model: undefined }),
    }

    list[matchIndex] = updatedAgent
    const saved = await saveOpenClawConfig(config)
    if (!saved.ok) return { ok: false, error: saved.error }

    return { ok: true, agentId: resolvedId, created: false, updated: true, restartNeeded: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Remove an agent from ~/.openclaw/openclaw.json by agent id.
 */
export async function removeAgentFromOpenClaw(agentId: string | null | undefined): Promise<RemoveAgentResult> {
  try {
    const resolvedId = normalizeText(agentId)
    if (!resolvedId) {
      return { ok: false, error: 'Missing agent identifier' }
    }

    const loaded = await loadOpenClawConfig()
    if (!loaded.config) {
      return { ok: false, error: loaded.error ?? 'Failed to load OpenClaw config' }
    }

    const config = loaded.config
    const list = ensureAgentsList(config)
    const matchIndex = list.findIndex((a) => normalizeText(a.id).toLowerCase() === resolvedId.toLowerCase())

    if (matchIndex === -1) {
      return { ok: true, removed: false, restartNeeded: false }
    }

    list.splice(matchIndex, 1)
    const saved = await saveOpenClawConfig(config)
    if (!saved.ok) return { ok: false, error: saved.error }

    return { ok: true, removed: true, restartNeeded: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Sync an agent's model configuration to OpenClaw config file
 */
export async function syncAgentModelToOpenClaw(
  sessionKey: string,
  model: string | null | undefined,
  fallbacks: string[] | null | undefined,
  runtimeAgentId?: string | null
): Promise<SyncResult> {
  try {
    // Extract agent ID from session key
    const agentId = extractAgentIdFromSessionKey(sessionKey) ?? normalizeText(runtimeAgentId)
    if (!agentId) {
      return { ok: false, error: `Invalid session key format: ${sessionKey}` }
    }

    const loaded = await loadOpenClawConfig()
    if (!loaded.config) {
      return { ok: false, error: loaded.error ?? 'Failed to load OpenClaw config' }
    }
    const config = loaded.config

    // Find agent in list
    const agentList = ensureAgentsList(config)
    if (!Array.isArray(agentList) || agentList.length === 0) {
      return { ok: false, error: 'No agents.list array in OpenClaw config' }
    }

    const agentIndex = agentList.findIndex(
      (a) => a.id === agentId || a.name?.toLowerCase() === agentId.toLowerCase()
    )

    if (agentIndex === -1) {
      return { ok: false, error: `Agent "${agentId}" not found in OpenClaw config` }
    }

    // Update model config
    const agent = agentList[agentIndex]
    
    // Only update if we have values to set
    if (model !== undefined || fallbacks !== undefined) {
      agent.model = applyModelPatch(agent.model, model, fallbacks)

      // Write back
      const saved = await saveOpenClawConfig(config)
      if (!saved.ok) {
        return { ok: false, error: saved.error }
      }

      console.log(`[openclaw-config] Synced agent "${agentId}" model config`)
      
      return { ok: true, restartNeeded: true }
    }

    return { ok: true, restartNeeded: false }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Read current model config for an agent from OpenClaw
 */
export async function getAgentModelFromOpenClaw(
  sessionKey: string
): Promise<{ model?: string; fallbacks?: string[] } | null> {
  try {
    const agentId = extractAgentIdFromSessionKey(sessionKey)
    if (!agentId) return null

    const loaded = await loadOpenClawConfig()
    if (!loaded.config) return null
    const list = ensureAgentsList(loaded.config)

    const agent = list.find(
      (a) => a.id === agentId || a.name?.toLowerCase() === agentId.toLowerCase()
    )

    if (!agent) return null

    return {
      model: agent.model?.primary,
      fallbacks: agent.model?.fallbacks,
    }
  } catch {
    return null
  }
}
