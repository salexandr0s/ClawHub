import { MemoryClient } from './memory-client'

export const metadata = {
  title: 'Memory | ClawHub',
  description: 'Manage memory index and browse daily notes',
}

export default function MemoryPage() {
  return <MemoryClient />
}
