'use client'

import { useState, useCallback, useEffect } from 'react'
import { PageHeader, PageSection, TypedConfirmModal } from '@clawhub/ui'
import { StatusPill } from '@/components/ui/status-pill'
import { RightDrawer } from '@/components/shell/right-drawer'
import { YamlEditor } from '@/components/editors/yaml-editor'
import { playbooksApi, maintenanceApi, type PlaybookWithContent, type MaintenanceStatus, type PlaybookRunResult, HttpError } from '@/lib/http'
import { useProtectedAction } from '@/lib/hooks/useProtectedAction'
import type { GatewayStatusDTO } from '@/lib/data'
import type { ActionKind } from '@clawhub/core'
import { cn } from '@/lib/utils'
import {
  RefreshCw,
  Database,
  Wifi,
  Server,
  Play,
  Trash2,
  RotateCcw,
  FileCode,
  Loader2,
  Edit3,
  Stethoscope,
  Wrench,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react'

interface Props {
  gateway: GatewayStatusDTO
  playbooks: Array<{
    id: string
    name: string
    description: string
    severity: 'info' | 'warn' | 'critical'
    modifiedAt: Date
  }>
}

// Doctor check result parsed from CLI output
interface DoctorCheck {
  category: string
  name: string
  status: 'pass' | 'warn' | 'fail'
  message?: string
  detail?: string
}

type MaintenanceAction = 'health' | 'doctor' | 'doctor-fix' | 'cache-clear' | 'sessions-reset' | 'gateway-restart' | 'recover'

const ACTION_CONFIG: Record<MaintenanceAction, {
  title: string
  description: string
  actionKind: ActionKind
  icon: React.ComponentType<{ className?: string }>
}> = {
  'health': {
    title: 'Run Health Check',
    description: 'Verify all connections and services',
    actionKind: 'maintenance.health_check',
    icon: RefreshCw,
  },
  'doctor': {
    title: 'Run Doctor',
    description: 'Run diagnostics to identify issues',
    actionKind: 'doctor.run',
    icon: Stethoscope,
  },
  'doctor-fix': {
    title: 'Run Doctor (Auto-Fix)',
    description: 'Run diagnostics and apply automatic fixes',
    actionKind: 'doctor.fix',
    icon: Wrench,
  },
  'cache-clear': {
    title: 'Clear Cache',
    description: 'Purge all cached data',
    actionKind: 'maintenance.cache_clear',
    icon: Trash2,
  },
  'sessions-reset': {
    title: 'Reset Sessions',
    description: 'Disconnect all agents and reset sessions',
    actionKind: 'maintenance.sessions_reset',
    icon: RotateCcw,
  },
  'gateway-restart': {
    title: 'Restart Gateway',
    description: 'Restart the OpenClaw gateway service',
    actionKind: 'gateway.restart',
    icon: RotateCcw,
  },
  'recover': {
    title: 'Recover Gateway',
    description: 'Run full recovery playbook (health → doctor → fix → restart)',
    actionKind: 'maintenance.recover_gateway',
    icon: Wrench,
  },
}

export function MaintenanceClient({ gateway: initialGateway, playbooks: initialPlaybooks }: Props) {
  const [gateway, setGateway] = useState(initialGateway)
  const [playbooks, setPlaybooks] = useState(initialPlaybooks)
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookWithContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playbookContent, setPlaybookContent] = useState<string>('')
  const [runningAction, setRunningAction] = useState<MaintenanceAction | null>(null)
  const [runningPlaybookId, setRunningPlaybookId] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{
    action: MaintenanceAction | 'playbook'
    success: boolean
    message: string
    receiptId?: string
    playbookResult?: PlaybookRunResult
    doctorOutput?: string
    doctorChecks?: DoctorCheck[]
  } | null>(null)
  const [cliStatus, setCliStatus] = useState<{
    available: boolean
    version: string | null
    minVersion: string
    belowMinVersion?: boolean
    error?: string
  } | null>(null)

  const [localOnly, setLocalOnly] = useState<MaintenanceStatus['localOnly'] | null>(null)

  const protectedAction = useProtectedAction()

  const applyMaintenanceStatus = useCallback((status: MaintenanceStatus) => {
    setGateway((prev) => ({
      ...prev,
      status: status.health.status,
      latencyMs: status.probe.latencyMs,
      version: status.status.version || prev.version,
      uptime: status.status.uptime || prev.uptime,
      lastCheckAt: new Date(status.timestamp),
    }))
    setCliStatus({
      available: status.cliAvailable,
      version: status.cliVersion,
      minVersion: status.minVersion,
      belowMinVersion: status.belowMinVersion,
      error: status.cliError,
    })
    setLocalOnly(status.localOnly ?? null)
  }, [])

  const refreshStatus = useCallback(async () => {
    try {
      const statusResult = await maintenanceApi.getStatus()
      applyMaintenanceStatus(statusResult.data)
    } catch (err) {
      console.error('Failed to refresh maintenance status:', err)
    }
  }, [applyMaintenanceStatus])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // Handle playbook click - open in drawer
  const handlePlaybookClick = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await playbooksApi.get(id)
      setSelectedPlaybook(result.data)
      setPlaybookContent(result.data.content)
    } catch (err) {
      console.error('Failed to load playbook:', err)
      setError(err instanceof Error ? err.message : 'Failed to load playbook')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle save with Governor gating
  const handleSave = useCallback(async (content: string): Promise<void> => {
    if (!selectedPlaybook) return

    return new Promise((resolve, reject) => {
      protectedAction.trigger({
        actionKind: 'action.caution',
        actionTitle: 'Edit Playbook',
        actionDescription: `You are editing the "${selectedPlaybook.name}" playbook. Changes will take effect immediately.`,
        onConfirm: async (typedConfirmText) => {
          setIsSaving(true)
          setError(null)

          try {
            const result = await playbooksApi.update(selectedPlaybook.id, {
              content,
              typedConfirmText,
            })
            setSelectedPlaybook(result.data)
            setPlaybookContent(content)
            // Update the list
            setPlaybooks((prev) =>
              prev.map((p) =>
                p.id === selectedPlaybook.id
                  ? { ...p, modifiedAt: result.data.modifiedAt }
                  : p
              )
            )
            resolve()
          } catch (err) {
            console.error('Failed to save playbook:', err)
            if (err instanceof HttpError) {
              setError(err.message)
            }
            reject(err)
          } finally {
            setIsSaving(false)
          }
        },
        onError: (err) => {
          setError(err.message)
          reject(err)
        },
      })
    })
  }, [selectedPlaybook, protectedAction])

  // Handle maintenance action
  const handleAction = useCallback((action: MaintenanceAction) => {
    const config = ACTION_CONFIG[action]
    setLastResult(null)

    protectedAction.trigger({
      actionKind: config.actionKind,
      actionTitle: config.title,
      actionDescription: config.description,
      onConfirm: async (typedConfirmText) => {
        setRunningAction(action)
        setError(null)

        try {
          if (action === 'recover') {
            const result = await maintenanceApi.recover(typedConfirmText)
            const success = result.data.finalStatus === 'healthy' || result.data.finalStatus === 'recovered'
            setLastResult({
              action,
              success,
              message: success
                ? 'Gateway recovered successfully'
                : result.data.finalStatus === 'needs_manual_intervention'
                  ? 'Recovery incomplete - manual intervention required'
                  : 'Recovery failed',
              receiptId: result.receiptId,
            })

            // Refresh gateway status after recovery
            if (success) {
              await refreshStatus()
            }
          } else {
            const result = await maintenanceApi.runAction(action, typedConfirmText)
            const success = result.data.exitCode === 0

            // Parse doctor output for better display
            let doctorOutput: string | undefined
            let doctorChecks: DoctorCheck[] | undefined

            if (action === 'doctor' || action === 'doctor-fix') {
              doctorOutput = result.data.stdout
              doctorChecks = parseDoctorOutput(result.data.stdout)
            }

            setLastResult({
              action,
              success,
              message: success
                ? `${config.title} completed successfully`
                : `${config.title} failed (exit code: ${result.data.exitCode})`,
              receiptId: result.data.receiptId,
              doctorOutput,
              doctorChecks,
            })

            // Refresh gateway status after health check
            if (action === 'health' && success && result.data.parsedJson) {
              const healthData = result.data.parsedJson as { status?: string }
              setGateway((prev) => ({
                ...prev,
                status: (healthData.status as 'ok' | 'degraded' | 'down') || prev.status,
                lastCheckAt: new Date(),
              }))
            }
          }
        } catch (err) {
          console.error(`Failed to run ${action}:`, err)
          setError(err instanceof Error ? err.message : `Failed to run ${action}`)
          setLastResult({
            action,
            success: false,
            message: err instanceof Error ? err.message : 'Action failed',
          })
        } finally {
          setRunningAction(null)
        }
      },
      onError: (err) => {
        console.error(`Action ${action} error:`, err)
        setError(err.message)
        setRunningAction(null)
      },
    })
  }, [gateway, protectedAction, refreshStatus])

  // Handle playbook run
  const handleRunPlaybook = useCallback((playbook: { id: string; name: string; severity: 'info' | 'warn' | 'critical' }) => {
    setLastResult(null)

    const actionKind = playbook.severity === 'critical' ? 'action.danger' : 'action.caution'

    protectedAction.trigger({
      actionKind,
      actionTitle: `Run Playbook: ${playbook.name}`,
      actionDescription: `Execute the "${playbook.name}" playbook. This will run all steps defined in the playbook.`,
      onConfirm: async (typedConfirmText) => {
        setRunningPlaybookId(playbook.id)
        setError(null)

        try {
          const result = await playbooksApi.run(playbook.id, { typedConfirmText })
          const success = result.data.status === 'completed'
          setLastResult({
            action: 'playbook',
            success,
            message: success
              ? `Playbook "${playbook.name}" completed successfully (${result.data.steps.length} steps)`
              : `Playbook "${playbook.name}" failed`,
            receiptId: result.receiptId,
            playbookResult: result.data,
          })
        } catch (err) {
          console.error(`Failed to run playbook ${playbook.id}:`, err)
          setError(err instanceof Error ? err.message : 'Failed to run playbook')
          setLastResult({
            action: 'playbook',
            success: false,
            message: err instanceof Error ? err.message : 'Playbook execution failed',
          })
        } finally {
          setRunningPlaybookId(null)
        }
      },
      onError: (err) => {
        console.error(`Playbook ${playbook.id} error:`, err)
        setError(err.message)
        setRunningPlaybookId(null)
      },
    })
  }, [protectedAction])

  const cliVersionLabel = cliStatus?.version ?? 'unknown'
  const showCliTooOld = cliStatus?.available && cliStatus.belowMinVersion
  const showCliUnknown = cliStatus?.available && !cliStatus.belowMinVersion && cliVersionLabel === 'unknown'
  const blockCriticalActions = cliStatus?.belowMinVersion === true

  const localOnlyEnabled = localOnly?.missionControl?.enforced === true
  const openclawLocalOk = localOnly?.openclawDashboard?.ok !== false

  return (
    <>
      <div className="w-full space-y-6">
        <PageHeader
          title="Maintenance"
          subtitle="Gateway console and system tools"
        />

        {(showCliTooOld || showCliUnknown) && (
          <div className="p-3 rounded-md border flex items-start gap-2 bg-status-warning/10 border-status-warning/30">
            <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
            <div className="text-sm text-status-warning">
              {showCliTooOld ? (
                <>OpenClaw version too old: {cliVersionLabel} (min: {cliStatus?.minVersion}). Some commands may fail.</>
              ) : (
                <>OpenClaw version unknown (min: {cliStatus?.minVersion}). Some commands may fail.</>
              )}
            </div>
          </div>
        )}

        {/* Last Result Banner */}
        {lastResult && (
          <div className={cn(
            'p-3 rounded-md border',
            lastResult.success
              ? 'bg-status-success/10 border-status-success/30'
              : 'bg-status-error/10 border-status-error/30'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {lastResult.success ? (
                  <CheckCircle className="w-4 h-4 text-status-success shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-status-error shrink-0" />
                )}
                <span className={cn(
                  'text-sm',
                  lastResult.success ? 'text-status-success' : 'text-status-error'
                )}>
                  {lastResult.message}
                </span>
              </div>
              {lastResult.receiptId && (
                <span className="text-xs text-fg-2 font-mono">
                  Receipt: {lastResult.receiptId}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Doctor Results Display */}
        {lastResult && (lastResult.action === 'doctor' || lastResult.action === 'doctor-fix') && (lastResult.doctorChecks || lastResult.doctorOutput) && (
          <PageSection title="Doctor Results" description="Diagnostic check results">
            <DoctorResultsDisplay
              checks={lastResult.doctorChecks || []}
              rawOutput={lastResult.doctorOutput}
            />
          </PageSection>
        )}

        {/* Gateway Status */}
        <div className="bg-bg-2 rounded-[var(--radius-lg)] border border-bd-0 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg-0">Gateway Status</h2>
            <div className="flex items-center gap-2">
              <StatusPill
                tone={localOnlyEnabled && openclawLocalOk ? 'success' : 'warning'}
                label={localOnlyEnabled && openclawLocalOk ? 'LOCAL-ONLY: ENABLED' : 'LOCAL-ONLY: UNSAFE'}
              />
              <StatusPill
                tone={gateway.status === 'ok' ? 'success' : gateway.status === 'degraded' ? 'warning' : 'danger'}
                label={gateway.status.toUpperCase()}
              />
              <button
                onClick={() => handleAction('health')}
                disabled={runningAction !== null}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                {runningAction === 'health' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusCard
              label="Latency"
              value={`${gateway.latencyMs}ms`}
              icon={RefreshCw}
            />
            <StatusCard
              label="Version"
              value={gateway.version}
              icon={Server}
            />
            <StatusCard
              label="Uptime"
              value={formatUptime(gateway.uptime)}
              icon={Play}
            />
            <StatusCard
              label="Last Check"
              value={formatRelativeTime(gateway.lastCheckAt)}
              icon={RefreshCw}
            />
          </div>

          {/* Connections */}
          <div className="pt-4 border-t border-bd-0">
            <h3 className="text-xs font-medium text-fg-2 mb-3">Connections</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ConnectionCard
                label="OpenClaw"
                status={gateway.connections.openClaw}
                icon={Server}
              />
              <ConnectionCard
                label="Database"
                status={gateway.connections.database}
                icon={Database}
              />
              <ConnectionCard
                label="Redis"
                status={gateway.connections.redis}
                icon={Wifi}
              />
            </div>
          </div>
        </div>

        {/* Maintenance Actions */}
        <PageSection title="Actions" description="System maintenance operations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LiveActionCard
              action="doctor"
              config={ACTION_CONFIG['doctor']}
              isRunning={runningAction === 'doctor'}
              disabled={runningAction !== null}
              onClick={() => handleAction('doctor')}
            />
            <LiveActionCard
              action="doctor-fix"
              config={ACTION_CONFIG['doctor-fix']}
              isRunning={runningAction === 'doctor-fix'}
              disabled={runningAction !== null || blockCriticalActions}
              onClick={() => handleAction('doctor-fix')}
              danger
            />
            <LiveActionCard
              action="cache-clear"
              config={ACTION_CONFIG['cache-clear']}
              isRunning={runningAction === 'cache-clear'}
              disabled={runningAction !== null}
              onClick={() => handleAction('cache-clear')}
              danger
            />
            <LiveActionCard
              action="sessions-reset"
              config={ACTION_CONFIG['sessions-reset']}
              isRunning={runningAction === 'sessions-reset'}
              disabled={runningAction !== null}
              onClick={() => handleAction('sessions-reset')}
              danger
            />
          </div>
        </PageSection>

        {/* Recovery */}
        <PageSection title="Recovery" description="One-click gateway recovery playbook">
          <div className="p-4 bg-bg-3 rounded-[var(--radius-lg)] border border-bd-0">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-status-warning/10 rounded-lg">
                <Wrench className="w-6 h-6 text-status-warning" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-fg-0">Recover Gateway</h3>
                <p className="text-xs text-fg-2 mt-1">
                  Runs the full recovery playbook: health check → diagnostics → auto-fix → restart → verify.
                  Use this when the gateway is unhealthy or unresponsive.
                </p>
                {blockCriticalActions && (
                  <p className="text-xs text-status-warning mt-2">
                    Requires OpenClaw {cliStatus?.minVersion} or newer.
                  </p>
                )}
              </div>
              <button
                onClick={() => handleAction('recover')}
                disabled={runningAction !== null || blockCriticalActions}
                className="btn-primary flex items-center gap-1.5"
              >
                {runningAction === 'recover' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wrench className="w-3.5 h-3.5" />
                )}
                Run Recovery
              </button>
            </div>
          </div>
        </PageSection>

        {/* Playbooks */}
        <PageSection title="Playbooks" description="Automated maintenance procedures">
          <div className="space-y-2">
            {playbooks.map((playbook) => (
              <PlaybookCard
                key={playbook.id}
                id={playbook.id}
                name={playbook.name}
                description={playbook.description}
                severity={playbook.severity}
                modifiedAt={playbook.modifiedAt}
                onEdit={() => handlePlaybookClick(playbook.id)}
                onRun={() => handleRunPlaybook(playbook)}
                isRunning={runningPlaybookId === playbook.id}
              />
            ))}
          </div>
        </PageSection>
      </div>

      {/* Playbook Editor Drawer */}
      <RightDrawer
        open={!!selectedPlaybook}
        onClose={() => {
          setSelectedPlaybook(null)
          setError(null)
        }}
        title={selectedPlaybook?.name ?? ''}
        description="YAML playbook configuration"
        width="lg"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-fg-2" />
          </div>
        ) : selectedPlaybook ? (
          <YamlEditor
            value={playbookContent}
            onChange={setPlaybookContent}
            onSave={handleSave}
            filePath={`playbooks/${selectedPlaybook.name}.yaml`}
            isSaving={isSaving}
            error={error}
            height="calc(100vh - 200px)"
          />
        ) : null}
      </RightDrawer>

      {/* Confirm Modal */}
      <TypedConfirmModal
        isOpen={protectedAction.state.isOpen}
        onClose={protectedAction.cancel}
        onConfirm={protectedAction.confirm}
        actionTitle={protectedAction.state.actionTitle}
        actionDescription={protectedAction.state.actionDescription}
        confirmMode={protectedAction.confirmMode}
        riskLevel={protectedAction.riskLevel}
        workOrderCode={protectedAction.state.workOrderCode}
        entityName={protectedAction.state.entityName}
        isLoading={protectedAction.state.isLoading}
      />
    </>
  )
}

function StatusCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="p-3 bg-bg-3 rounded-[var(--radius-md)] border border-bd-0">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-fg-2" />
        <span className="text-xs text-fg-2">{label}</span>
      </div>
      <span className="font-mono text-sm text-fg-0">{value}</span>
    </div>
  )
}

function ConnectionCard({
  label,
  status,
  icon: Icon,
}: {
  label: string
  status: 'connected' | 'disconnected' | 'error'
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-bg-3 rounded-[var(--radius-md)] border border-bd-0">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-fg-2" />
        <span className="text-sm text-fg-1">{label}</span>
      </div>
      <span className={cn(
        'w-2 h-2 rounded-full',
        status === 'connected' && 'bg-status-success',
        status === 'disconnected' && 'bg-fg-3',
        status === 'error' && 'bg-status-danger'
      )} />
    </div>
  )
}

function LiveActionCard({
  action: _action,
  config,
  isRunning,
  disabled,
  danger,
  onClick,
}: {
  action: MaintenanceAction
  config: typeof ACTION_CONFIG[MaintenanceAction]
  isRunning: boolean
  disabled: boolean
  danger?: boolean
  onClick: () => void
}) {
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border text-left transition-colors',
        disabled && !isRunning
          ? 'bg-bg-3/50 border-bd-0/50 cursor-not-allowed opacity-60'
          : danger
            ? 'bg-bg-3 border-bd-0 hover:bg-status-error/10 hover:border-status-error/30'
            : 'bg-bg-3 border-bd-0 hover:bg-bg-2 hover:border-bd-1'
      )}
    >
      {isRunning ? (
        <Loader2 className="w-5 h-5 text-accent-primary shrink-0 mt-0.5 animate-spin" />
      ) : (
        <Icon className={cn(
          'w-5 h-5 shrink-0 mt-0.5',
          danger ? 'text-status-error' : 'text-fg-2'
        )} />
      )}
      <div>
        <h3 className={cn(
          'text-sm font-medium',
          danger ? 'text-status-error' : 'text-fg-0'
        )}>
          {config.title}
        </h3>
        <p className="text-xs text-fg-2 mt-0.5">{config.description}</p>
      </div>
    </button>
  )
}

function PlaybookCard({
  name,
  description,
  severity,
  modifiedAt,
  onEdit,
  onRun,
  isRunning,
}: {
  id: string
  name: string
  description: string
  severity: 'info' | 'warn' | 'critical'
  modifiedAt: Date
  onEdit: () => void
  onRun: () => void
  isRunning: boolean
}) {
  const severityColors = {
    info: 'bg-status-info/10 text-status-info',
    warn: 'bg-status-warning/10 text-status-warning',
    critical: 'bg-status-danger/10 text-status-danger',
  }

  return (
    <div className="flex items-center justify-between p-3 bg-bg-3 rounded-[var(--radius-md)] border border-bd-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-fg-2 shrink-0" />
          <span className="font-mono text-sm text-fg-0">{name}</span>
          <span className={cn(
            'px-1.5 py-0.5 text-xs rounded',
            severityColors[severity]
          )}>
            {severity}
          </span>
        </div>
        <p className="text-xs text-fg-2 mt-0.5 ml-6">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <span className="text-xs text-fg-3">{formatRelativeTime(modifiedAt)}</span>
        <button
          onClick={onEdit}
          className="p-1.5 hover:bg-bg-2 rounded-[var(--radius-sm)] transition-colors"
          title="Edit playbook"
        >
          <Edit3 className="w-3.5 h-3.5 text-fg-2" />
        </button>
        <button
          onClick={onRun}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[var(--radius-sm)] transition-colors',
            severity === 'critical'
              ? 'bg-status-danger/10 text-status-danger hover:bg-status-danger/20'
              : 'bg-status-success/10 text-status-success hover:bg-status-success/20',
            'disabled:opacity-50'
          )}
          title="Run playbook"
        >
          {isRunning ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          Run
        </button>
      </div>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return `${days}d ${hours}h`
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = now.getTime() - d.getTime()
  const secs = Math.floor(diff / 1000)
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (secs < 60) return `${secs}s ago`
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

/**
 * Parse doctor CLI output into structured checks
 * Common formats:
 * - [✓] Check name - Description
 * - [✗] Check name - Description
 * - [!] Check name - Warning message
 * - Category:
 *   [✓] Check...
 */
function parseDoctorOutput(output: string): DoctorCheck[] {
  const checks: DoctorCheck[] = []
  const lines = output.split('\n')
  let currentCategory = 'General'

  for (const line of lines) {
    const trimmed = line.trim()

    // Check for category headers (lines ending with :)
    if (/^[A-Z][a-z]+.*:$/.test(trimmed)) {
      currentCategory = trimmed.replace(/:$/, '')
      continue
    }

    // Parse check lines with status indicators
    // Match: [✓] name or [✗] name or [!] name or [ ] name
    const checkMatch = trimmed.match(/^\[(✓|✗|!|×|√| )\]\s*(.+)$/)
    if (checkMatch) {
      const [, statusChar, rest] = checkMatch
      let status: 'pass' | 'warn' | 'fail' = 'pass'

      if (statusChar === '✗' || statusChar === '×') {
        status = 'fail'
      } else if (statusChar === '!') {
        status = 'warn'
      } else if (statusChar === ' ') {
        status = 'warn'
      }

      // Split name and message by common delimiters
      const parts = rest.split(/\s*[-–:]\s*(.*)/)
      const name = parts[0] || rest
      const message = parts[1] || undefined

      checks.push({
        category: currentCategory,
        name: name.trim(),
        status,
        message: message?.trim(),
      })
      continue
    }

    // Also match simpler formats: PASS/FAIL/WARN prefix
    const simpleMatch = trimmed.match(/^(PASS|FAIL|WARN|OK|ERROR)\s*[:\-]\s*(.+)$/i)
    if (simpleMatch) {
      const [, statusWord, rest] = simpleMatch
      let status: 'pass' | 'warn' | 'fail' = 'pass'

      const statusLower = statusWord.toLowerCase()
      if (statusLower === 'fail' || statusLower === 'error') {
        status = 'fail'
      } else if (statusLower === 'warn') {
        status = 'warn'
      }

      checks.push({
        category: currentCategory,
        name: rest.trim(),
        status,
      })
    }
  }

  return checks
}

/**
 * Display doctor results with expandable categories
 */
function DoctorResultsDisplay({
  checks,
  rawOutput,
}: {
  checks: DoctorCheck[]
  rawOutput?: string
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showRaw, setShowRaw] = useState(false)

  // Group checks by category
  const byCategory = checks.reduce((acc, check) => {
    if (!acc[check.category]) {
      acc[check.category] = []
    }
    acc[check.category].push(check)
    return acc
  }, {} as Record<string, DoctorCheck[]>)

  // Calculate summary
  const summary = {
    pass: checks.filter((c) => c.status === 'pass').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length,
  }

  const toggleCategory = (category: string) => {
    setExpanded((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  if (checks.length === 0 && rawOutput) {
    // Show raw output if parsing didn't find checks
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-fg-0">Doctor Output</span>
        </div>
        <pre className="text-xs text-fg-2 font-mono bg-bg-3 p-3 rounded-[var(--radius-md)] border border-bd-0 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
          {rawOutput}
        </pre>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-status-success/10 border border-status-success/30 rounded-[var(--radius-md)]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-status-success" />
            <span className="text-lg font-bold text-status-success">{summary.pass}</span>
          </div>
          <span className="text-xs text-status-success/80">Passed</span>
        </div>
        <div className="p-3 bg-status-warning/10 border border-status-warning/30 rounded-[var(--radius-md)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-warning" />
            <span className="text-lg font-bold text-status-warning">{summary.warn}</span>
          </div>
          <span className="text-xs text-status-warning/80">Warnings</span>
        </div>
        <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-[var(--radius-md)]">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-status-error" />
            <span className="text-lg font-bold text-status-error">{summary.fail}</span>
          </div>
          <span className="text-xs text-status-error/80">Failed</span>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {Object.entries(byCategory).map(([category, categoryChecks]) => {
          const isExpanded = expanded[category] ?? categoryChecks.some((c) => c.status === 'fail')
          const categoryFails = categoryChecks.filter((c) => c.status === 'fail').length
          const categoryWarns = categoryChecks.filter((c) => c.status === 'warn').length

          return (
            <div
              key={category}
              className="bg-bg-3 rounded-[var(--radius-md)] border border-bd-0 overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 p-3 hover:bg-bg-2 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-fg-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-fg-2" />
                )}
                <span className="font-medium text-fg-0">{category}</span>
                <span className="text-xs text-fg-3">({categoryChecks.length} checks)</span>
                {categoryFails > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-xs rounded bg-status-error/20 text-status-error">
                    {categoryFails} failed
                  </span>
                )}
                {categoryWarns > 0 && categoryFails === 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-xs rounded bg-status-warning/20 text-status-warning">
                    {categoryWarns} warnings
                  </span>
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-bd-0">
                  {categoryChecks.map((check, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 border-b border-bd-0/50 last:border-b-0"
                    >
                      {check.status === 'pass' && (
                        <CheckCircle className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                      )}
                      {check.status === 'warn' && (
                        <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
                      )}
                      {check.status === 'fail' && (
                        <XCircle className="w-4 h-4 text-status-error shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            'text-sm',
                            check.status === 'pass' && 'text-fg-0',
                            check.status === 'warn' && 'text-status-warning',
                            check.status === 'fail' && 'text-status-error'
                          )}
                        >
                          {check.name}
                        </span>
                        {check.message && (
                          <p className="text-xs text-fg-2 mt-0.5">{check.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Raw Output Toggle */}
      {rawOutput && (
        <div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1.5 text-xs text-fg-2 hover:text-fg-0 transition-colors"
          >
            {showRaw ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            View raw output
          </button>
          {showRaw && (
            <pre className="mt-2 text-xs text-fg-2 font-mono bg-bg-2 p-3 rounded-[var(--radius-md)] border border-bd-0 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
              {rawOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
