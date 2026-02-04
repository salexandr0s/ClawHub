import { StatusClient } from './status-client'

export const metadata = {
  title: 'Status | ClawHub',
  description: 'System status and health information',
}

export default function StatusPage() {
  return <StatusClient />
}
