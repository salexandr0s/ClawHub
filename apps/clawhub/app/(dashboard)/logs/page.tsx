import { LogsClient } from './logs-client'

export const metadata = {
  title: 'Logs | ClawHub',
  description: 'View and search OpenClaw system logs',
}

export default function LogsPage() {
  return <LogsClient />
}
