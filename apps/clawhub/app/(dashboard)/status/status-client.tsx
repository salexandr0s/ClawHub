'use client'

import { useState, useCallback } from 'react'
import { PageHeader, PageSection } from '@clawhub/ui'
import { statusApi, HttpError } from '@/lib/http'
import { OpenClawUnavailable } from '@/components/openclaw-unavailable'
import { cn } from '@/lib/utils'
import {
  Activity,
  RefreshCw,
  FileText,
  Heart,
  Server,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  Database,
  Globe,
  Cpu,
  HardDrive,
} from 'lucide-react'

type StatusSection = 'all' | 'health' | null

interface StatusState {
  isLoading: boolean
  section: StatusSection
  fullStatus: FullStatusReport | null
  healthStatus: HealthReport | null
  error: string | null
  receiptId: string | null
}

// Types for status reports
interface FullStatusReport {
  version: string
  build?: string
  uptime?: number
  uptimeHuman?: string
  workspace: string
  configPath: string
  dataDir: string
  gateway: {
    running: boolean
    url?: string
    pid?: number
    clients?: number
  }
  models: {
    default: string
    fallbacks: string[]
    configured: number
  }
  auth: {
    providers: Array<{
      provider: string
      status: 'ok' | 'expiring' | 'expired' | 'missing'
      profiles: number
    }>
  }
  cron: {
    enabled: boolean
    jobCount: number
    nextRun?: string
  }
  plugins: {
    installed: number
    active: number
  }
  memory?: {
    indexed: number
    lastIndexed?: string
  }
  raw?: string
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: HealthCheck[]
}

interface HealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  latencyMs?: number
  details?: Record<string, unknown>
}

export function StatusClient() {
  const [state, setState] = useState<StatusState>({
    isLoading: false,
    section: null,
    fullStatus: null,
    healthStatus: null,
    error: null,
    receiptId: null,
  })
  const [copied, setCopied] = useState(false)

  const fetchStatus = useCallback(async (section: StatusSection) => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      section,
      error: null,
    }))

    try {
      if (section === 'all') {
        const result = await statusApi.getFullStatus()
        setState((prev) => ({
          ...prev,
          isLoading: false,
          fullStatus: result.data,
          receiptId: result.receiptId || null,
        }))
      } else if (section === 'health') {
        const result = await statusApi.getHealth()
        setState((prev) => ({
          ...prev,
          isLoading: false,
          healthStatus: result.data,
          receiptId: result.receiptId || null,
        }))
      }
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to fetch status'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      section: 'all',
      error: null,
    }))

    try {
      const [fullResult, healthResult] = await Promise.all([
        statusApi.getFullStatus(),
        statusApi.getHealth(),
      ])
      setState((prev) => ({
        ...prev,
        isLoading: false,
        fullStatus: fullResult.data,
        healthStatus: healthResult.data,
        receiptId: fullResult.receiptId || null,
      }))
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to fetch status'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
    }
  }, [])

  const copyStatusReport = useCallback(() => {
    if (!state.fullStatus) return

    const report = state.fullStatus.raw || JSON.stringify(state.fullStatus, null, 2)
    navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [state.fullStatus])

  const retryConnection = useCallback(() => {
    refreshAll()
  }, [refreshAll])

  const { isLoading, section, fullStatus, healthStatus, error, receiptId } = state

  // Show OpenClaw unavailable error
  if (error && (error.includes('not found') || error.includes('not available') || error.includes('unavailable'))) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="System Status"
          subtitle="Monitor OpenClaw health and system information"
        />
        <OpenClawUnavailable error={error} onRetry={retryConnection} isRetrying={isLoading} />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="System Status"
        subtitle="Monitor OpenClaw health and system information"
      />

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-md border flex items-center gap-2 bg-status-error/10 border-status-error/30">
          <XCircle className="w-4 h-4 text-status-error shrink-0" />
          <span className="text-sm text-status-error">{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => fetchStatus('all')}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            'bg-accent-primary text-white hover:bg-accent-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading && section === 'all' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Full Status Report
        </button>

        <button
          onClick={() => fetchStatus('health')}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            'bg-bg-3 text-fg-0 hover:bg-bg-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading && section === 'health' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Heart className="w-4 h-4" />
          )}
          Check Health
        </button>

        <button
          onClick={refreshAll}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            'bg-bg-3 text-fg-0 hover:bg-bg-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading && section === 'all' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh All
        </button>
      </div>

      {/* Receipt ID */}
      {receiptId && (
        <div className="text-xs text-fg-3 font-mono">
          Receipt: {receiptId}
        </div>
      )}

      {/* Results */}
      {(fullStatus || healthStatus) && (
        <>
          {/* Health Status Overview */}
          {healthStatus && (
            <HealthOverview health={healthStatus} />
          )}

          {/* System Overview Cards */}
          {fullStatus && (
            <PageSection title="System Overview" description="Core system information">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatusCard
                  icon={Server}
                  label="Gateway"
                  value={fullStatus.gateway.running ? 'Running' : 'Stopped'}
                  status={fullStatus.gateway.running ? 'success' : 'error'}
                  detail={fullStatus.gateway.url || undefined}
                />
                <StatusCard
                  icon={Clock}
                  label="Uptime"
                  value={fullStatus.uptimeHuman || formatUptime(fullStatus.uptime)}
                  status="info"
                />
                <StatusCard
                  icon={Users}
                  label="Clients"
                  value={String(fullStatus.gateway.clients ?? 0)}
                  status="info"
                />
                <StatusCard
                  icon={Cpu}
                  label="Version"
                  value={fullStatus.version}
                  status="info"
                  detail={fullStatus.build}
                />
              </div>
            </PageSection>
          )}

          {/* Configuration */}
          {fullStatus && (
            <PageSection title="Configuration" description="Paths and settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ConfigCard
                  icon={HardDrive}
                  label="Workspace"
                  value={fullStatus.workspace}
                />
                <ConfigCard
                  icon={FileText}
                  label="Config Path"
                  value={fullStatus.configPath}
                />
                <ConfigCard
                  icon={Database}
                  label="Data Directory"
                  value={fullStatus.dataDir}
                />
                <ConfigCard
                  icon={Cpu}
                  label="Default Model"
                  value={fullStatus.models.default}
                />
              </div>
            </PageSection>
          )}

          {/* Subsystems */}
          {fullStatus && (
            <PageSection title="Subsystems" description="Component status">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SubsystemCard
                  label="Models"
                  items={[
                    { label: 'Default', value: fullStatus.models.default },
                    { label: 'Configured', value: String(fullStatus.models.configured) },
                    { label: 'Fallbacks', value: String(fullStatus.models.fallbacks.length) },
                  ]}
                />
                <SubsystemCard
                  label="Cron"
                  items={[
                    { label: 'Enabled', value: fullStatus.cron.enabled ? 'Yes' : 'No' },
                    { label: 'Jobs', value: String(fullStatus.cron.jobCount) },
                    ...(fullStatus.cron.nextRun ? [{ label: 'Next Run', value: fullStatus.cron.nextRun }] : []),
                  ]}
                />
                <SubsystemCard
                  label="Plugins"
                  items={[
                    { label: 'Installed', value: String(fullStatus.plugins.installed) },
                    { label: 'Active', value: String(fullStatus.plugins.active) },
                  ]}
                />
              </div>
            </PageSection>
          )}

          {/* Auth Providers */}
          {fullStatus && fullStatus.auth.providers.length > 0 && (
            <PageSection title="Auth Providers" description="Authentication status by provider">
              <div className="space-y-2">
                {fullStatus.auth.providers.map((provider) => (
                  <AuthProviderRow key={provider.provider} provider={provider} />
                ))}
              </div>
            </PageSection>
          )}

          {/* Health Checks Detail */}
          {healthStatus && healthStatus.checks.length > 0 && (
            <PageSection title="Health Checks" description="Detailed health check results">
              <div className="space-y-2">
                {healthStatus.checks.map((check, idx) => (
                  <HealthCheckRow key={idx} check={check} />
                ))}
              </div>
            </PageSection>
          )}

          {/* Raw Output for Debug */}
          {fullStatus && (
            <PageSection title="Debug Report" description="Copy this for troubleshooting">
              <div className="relative">
                <button
                  onClick={copyStatusReport}
                  className={cn(
                    'absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
                    'bg-bg-2 text-fg-1 hover:bg-bg-1 border border-bd-0'
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
                <pre className="bg-bg-3 border border-bd-0 rounded-[var(--radius-md)] p-4 text-xs font-mono text-fg-2 overflow-x-auto max-h-[300px] overflow-y-auto">
                  {fullStatus.raw || JSON.stringify(fullStatus, null, 2)}
                </pre>
              </div>
            </PageSection>
          )}
        </>
      )}

      {/* Initial State */}
      {!fullStatus && !healthStatus && !isLoading && (
        <div className="p-8 text-center bg-bg-2 rounded-[var(--radius-lg)]">
          <Activity className="w-16 h-16 mx-auto mb-4 text-fg-3" />
          <h3 className="text-lg font-medium text-fg-0 mb-2">Check System Status</h3>
          <p className="text-sm text-fg-2 max-w-md mx-auto mb-4">
            Get a comprehensive overview of your OpenClaw system including gateway status,
            health checks, configuration, and subsystem information.
          </p>
          <div className="flex flex-col gap-2 text-sm text-fg-2 max-w-sm mx-auto text-left">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 text-accent-primary shrink-0" />
              <span><strong>Full Status Report</strong> - Complete system information</span>
            </div>
            <div className="flex items-start gap-2">
              <Heart className="w-4 h-4 mt-0.5 text-fg-2 shrink-0" />
              <span><strong>Check Health</strong> - Run health diagnostics</span>
            </div>
            <div className="flex items-start gap-2">
              <RefreshCw className="w-4 h-4 mt-0.5 text-fg-2 shrink-0" />
              <span><strong>Refresh All</strong> - Update all status information</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !fullStatus && !healthStatus && (
        <div className="p-8 text-center bg-bg-2 rounded-[var(--radius-lg)]">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent-primary animate-spin" />
          <h3 className="text-lg font-medium text-fg-0 mb-2">
            Fetching Status...
          </h3>
          <p className="text-sm text-fg-2">
            Gathering system information from OpenClaw...
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function HealthOverview({ health }: { health: HealthReport }) {
  const statusConfig = {
    healthy: { color: 'bg-status-success/10 border-status-success/30', icon: CheckCircle, iconColor: 'text-status-success', label: 'System Healthy' },
    degraded: { color: 'bg-status-warning/10 border-status-warning/30', icon: AlertTriangle, iconColor: 'text-status-warning', label: 'System Degraded' },
    unhealthy: { color: 'bg-status-error/10 border-status-error/30', icon: XCircle, iconColor: 'text-status-error', label: 'System Unhealthy' },
  }

  const config = statusConfig[health.status]
  const Icon = config.icon
  const passCount = health.checks.filter((c) => c.status === 'pass').length
  const warnCount = health.checks.filter((c) => c.status === 'warn').length
  const failCount = health.checks.filter((c) => c.status === 'fail').length

  return (
    <div className={cn('p-4 rounded-[var(--radius-lg)] border flex items-center gap-4', config.color)}>
      <Icon className={cn('w-10 h-10', config.iconColor)} />
      <div className="flex-1">
        <h3 className={cn('font-semibold text-lg', config.iconColor)}>{config.label}</h3>
        <p className="text-sm text-fg-2">
          {passCount} passed, {warnCount} warnings, {failCount} failed
        </p>
      </div>
      <div className="text-xs text-fg-3">
        {new Date(health.timestamp).toLocaleString()}
      </div>
    </div>
  )
}

function StatusCard({
  icon: Icon,
  label,
  value,
  status,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  status: 'success' | 'error' | 'warning' | 'info'
  detail?: string
}) {
  const colors = {
    success: 'text-status-success',
    error: 'text-status-error',
    warning: 'text-status-warning',
    info: 'text-fg-0',
  }

  return (
    <div className="bg-bg-3 rounded-[var(--radius-md)] border border-bd-0 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-fg-2" />
        <span className="text-sm text-fg-2">{label}</span>
      </div>
      <div className={cn('text-xl font-semibold', colors[status])}>{value}</div>
      {detail && <div className="text-xs text-fg-3 mt-1 truncate">{detail}</div>}
    </div>
  )
}

function ConfigCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="bg-bg-3 rounded-[var(--radius-md)] border border-bd-0 p-3 flex items-center gap-3">
      <Icon className="w-5 h-5 text-fg-2 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-fg-2">{label}</div>
        <div className="text-sm text-fg-0 font-mono truncate" title={value}>{value}</div>
      </div>
    </div>
  )
}

function SubsystemCard({
  label,
  items,
}: {
  label: string
  items: Array<{ label: string; value: string }>
}) {
  return (
    <div className="bg-bg-3 rounded-[var(--radius-md)] border border-bd-0 p-4">
      <h4 className="text-sm font-medium text-fg-0 mb-3">{label}</h4>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-fg-2">{item.label}</span>
            <span className="text-fg-0 font-mono">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AuthProviderRow({
  provider,
}: {
  provider: { provider: string; status: string; profiles: number }
}) {
  const statusConfig = {
    ok: { color: 'text-status-success', icon: CheckCircle },
    expiring: { color: 'text-status-warning', icon: AlertTriangle },
    expired: { color: 'text-status-error', icon: XCircle },
    missing: { color: 'text-fg-3', icon: XCircle },
  }

  const config = statusConfig[provider.status as keyof typeof statusConfig] || statusConfig.missing
  const Icon = config.icon

  return (
    <div className="flex items-center gap-3 bg-bg-3 rounded-[var(--radius-md)] border border-bd-0 p-3">
      <Icon className={cn('w-4 h-4', config.color)} />
      <span className="text-sm font-medium text-fg-0 capitalize">{provider.provider}</span>
      <span className={cn('text-xs px-2 py-0.5 rounded', config.color, 'bg-bg-2')}>
        {provider.status}
      </span>
      <span className="text-xs text-fg-2 ml-auto">{provider.profiles} profile(s)</span>
    </div>
  )
}

function HealthCheckRow({ check }: { check: HealthCheck }) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig = {
    pass: { color: 'text-status-success', icon: CheckCircle },
    warn: { color: 'text-status-warning', icon: AlertTriangle },
    fail: { color: 'text-status-error', icon: XCircle },
  }

  const config = statusConfig[check.status]
  const Icon = config.icon

  return (
    <div className="bg-bg-3 rounded-[var(--radius-md)] border border-bd-0 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-bg-2 transition-colors"
      >
        <Icon className={cn('w-4 h-4', config.color)} />
        <span className="text-sm font-medium text-fg-0">{check.name}</span>
        <span className="text-xs text-fg-2 flex-1 text-left truncate">{check.message}</span>
        {check.latencyMs !== undefined && (
          <span className="text-xs text-fg-3">{check.latencyMs}ms</span>
        )}
        {check.details && (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-fg-3" />
          ) : (
            <ChevronRight className="w-4 h-4 text-fg-3" />
          )
        )}
      </button>
      {expanded && check.details && (
        <div className="px-3 pb-3 pl-10">
          <pre className="text-xs text-fg-2 whitespace-pre-wrap font-mono bg-bg-2 p-2 rounded">
            {JSON.stringify(check.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatUptime(seconds?: number): string {
  if (seconds === undefined) return 'N/A'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}
