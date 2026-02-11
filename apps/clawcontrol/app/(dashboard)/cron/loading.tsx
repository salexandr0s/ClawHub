import { PageHeader } from '@clawcontrol/ui'
import { InlineLoading } from '@/components/ui/loading-state'

export default function CronLoading() {
  return (
    <div className="p-3 sm:p-4">
      <PageHeader title="Cron Jobs" subtitle="Loading cron jobs…" />
      <InlineLoading label="Loading crons..." size="md" className="text-fg-3" />
    </div>
  )
}
