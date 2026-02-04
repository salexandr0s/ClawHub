/**
 * Repository Provider
 *
 * Single entry point for repository creation.
 * ClawHub requires OpenClaw - no mock mode support.
 */

import { createDbWorkOrdersRepo, type WorkOrdersRepo } from './workOrders'
import { createDbOperationsRepo, type OperationsRepo } from './operations'
import { createDbAgentsRepo, type AgentsRepo } from './agents'
import { createDbApprovalsRepo, type ApprovalsRepo } from './approvals'
import { createDbActivitiesRepo, type ActivitiesRepo } from './activities'
import { createDbReceiptsRepo, type ReceiptsRepo } from './receipts'
import { createDbSearchRepo, type SearchRepo } from './search'
import { createFsSkillsRepo, type SkillsRepo } from './skills'
import { createCliPluginsRepo, type PluginsRepo } from './plugins'
import { createCliGatewayRepo, type GatewayRepo } from './gateway'
import { createCliCronRepo, type CronRepo } from './cron'

// ============================================================================
// REPOSITORY CONTAINER
// ============================================================================

export interface Repos {
  // DB-backed repos (always real, no mock fallback in always-on)
  workOrders: WorkOrdersRepo
  operations: OperationsRepo
  agents: AgentsRepo
  approvals: ApprovalsRepo
  activities: ActivitiesRepo
  receipts: ReceiptsRepo
  search: SearchRepo

  // FS-backed repos
  skills: SkillsRepo

  // CLI-backed repos (mock only if USE_MOCK_DATA=true)
  plugins: PluginsRepo

  // OpenClaw-backed repos (availability-aware)
  gateway: GatewayRepo
  cron: CronRepo
}

// ============================================================================
// PROVIDER
// ============================================================================

// Track if we've logged the data mode (prevents spam on hot reload)
let hasLoggedMode = false

/**
 * Create the repository implementations.
 * ClawHub requires OpenClaw - all repos use real implementations.
 */
export function createRepos(): Repos {
  // Log data mode once (server-side only)
  if (!hasLoggedMode && typeof window === 'undefined') {
    console.log('[repo] Data mode: DB/FS/CLI (OpenClaw required)')
    hasLoggedMode = true
  }

  return {
    workOrders: createDbWorkOrdersRepo(),
    operations: createDbOperationsRepo(),
    agents: createDbAgentsRepo(),
    approvals: createDbApprovalsRepo(),
    activities: createDbActivitiesRepo(),
    receipts: createDbReceiptsRepo(),
    search: createDbSearchRepo(),
    skills: createFsSkillsRepo(),
    plugins: createCliPluginsRepo(),
    gateway: createCliGatewayRepo(),
    cron: createCliCronRepo(),
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let reposInstance: Repos | null = null

/**
 * Get the singleton repository instance.
 * Creates on first call, reuses on subsequent calls.
 */
export function getRepos(): Repos {
  if (!reposInstance) {
    reposInstance = createRepos()
  }
  return reposInstance
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetRepos(): void {
  reposInstance = null
}
