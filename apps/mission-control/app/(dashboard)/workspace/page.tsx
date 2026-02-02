import { getWorkspaceFiles } from '@/lib/data'
import { isWorkspaceReadOnly } from '@/lib/fs/workspace-fs'
import { WorkspaceClient } from './workspace-client'

export default async function WorkspacePage() {
  // Server-render a first pass (root listing) for fast load.
  const initialFiles = await getWorkspaceFiles('/')
  const readOnly = isWorkspaceReadOnly()
  return <WorkspaceClient initialFiles={initialFiles} readOnly={readOnly} />
}
