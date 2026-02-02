/**
 * Workspace FS
 *
 * Real filesystem-backed implementation for workspace browsing/editing.
 *
 * Paths are always expressed as workspace-relative paths starting with `/`.
 */

import { promises as fsp } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { realpathSync } from 'node:fs'
import { validateWorkspacePath, getWorkspaceRoot, getAllowedSubdirs, getAllowedRootFiles } from './path-policy'

export type WorkspaceEntryType = 'file' | 'folder'

export interface WorkspaceEntry {
  id: string
  name: string
  type: WorkspaceEntryType
  path: string // parent path, starts with '/'
  size?: number
  modifiedAt: Date
}

export interface WorkspaceEntryWithContent extends WorkspaceEntry {
  content: string
}

const WORKSPACE_READ_ONLY =
  process.env.OPENCLAW_WORKSPACE_READ_ONLY === 'true' ||
  process.env.MISSION_CONTROL_READ_ONLY === 'true'

class WorkspaceReadOnlyError extends Error {
  constructor() {
    super('Workspace is read-only')
    this.name = 'WorkspaceReadOnlyError'
  }
}

function assertInsideWorkspace(realAbsPath: string): void {
  const root = getWorkspaceRoot()
  if (!realAbsPath.startsWith(root)) {
    throw new Error('Path escapes workspace root')
  }
}

async function ensureSafeDirPath(absDir: string): Promise<void> {
  // Create directories one segment at a time so we can fail fast on symlink tricks.
  const root = getWorkspaceRoot()

  // Root must exist.
  await fsp.mkdir(root, { recursive: true })
  assertInsideWorkspace(realpathSync(root))

  // Walk from root → target dir
  const rel = absDir.slice(root.length).split('/').filter(Boolean)
  let current = root

  for (const seg of rel) {
    const next = join(current, seg)

    try {
      const st = await fsp.lstat(next).catch(() => null)
      if (!st) {
        await fsp.mkdir(next)
      } else {
        if (st.isSymbolicLink()) {
          throw new Error('Path contains symlink segment')
        }
        if (!st.isDirectory()) {
          throw new Error('Path segment is not a directory')
        }
      }

      // Resolve after create/verify
      const rp = realpathSync(next)
      assertInsideWorkspace(rp)

      current = next
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Unsafe workspace directory path: ${msg}`)
    }
  }
}

// We encode the workspace-relative full path (e.g. "/agents/foo.md") as id.
export function encodeWorkspaceId(fullPath: string): string {
  const normalized = fullPath.startsWith('/') ? fullPath : `/${fullPath}`
  return Buffer.from(normalized, 'utf8').toString('base64url')
}

export function decodeWorkspaceId(id: string): string {
  const decoded = Buffer.from(id, 'base64url').toString('utf8')
  if (!decoded.startsWith('/')) return `/${decoded}`
  return decoded
}

export async function listWorkspace(path = '/'): Promise<WorkspaceEntry[]> {
  const res = validateWorkspacePath(path)
  if (!res.valid || !res.resolvedPath) throw new Error(res.error || 'Invalid path')

  const absDir = res.resolvedPath
  const entries = await fsp.readdir(absDir, { withFileTypes: true })

  const out: WorkspaceEntry[] = []
  const allowedSubdirs = new Set(getAllowedSubdirs())
  const allowedRootFiles = new Set(getAllowedRootFiles())

  for (const ent of entries) {
    // Skip dotfiles by default (can revisit)
    if (ent.name.startsWith('.')) continue
    if (ent.isSymbolicLink()) continue

    // At root, only expose allowlisted folders/files.
    if (path === '/') {
      if (ent.isDirectory()) {
        if (!allowedSubdirs.has(ent.name)) continue
      } else {
        if (!allowedRootFiles.has(ent.name)) continue
      }
    }

    const abs = join(absDir, ent.name)
    const st = await fsp.lstat(abs)

    out.push({
      id: encodeWorkspaceId(path === '/' ? `/${ent.name}` : `${path}/${ent.name}`),
      name: ent.name,
      type: ent.isDirectory() ? 'folder' : 'file',
      path,
      size: ent.isDirectory() ? undefined : st.size,
      modifiedAt: st.mtime,
    })
  }

  // Sort: folders first, then files; then name
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return out
}

export async function readWorkspaceFileById(id: string): Promise<WorkspaceEntryWithContent> {
  const fullPath = decodeWorkspaceId(id)
  const res = validateWorkspacePath(fullPath)
  if (!res.valid || !res.resolvedPath) throw new Error(res.error || 'Invalid path')

  const abs = res.resolvedPath
  const st = await fsp.lstat(abs)
  if (st.isSymbolicLink()) {
    throw new Error('Refusing to read symlink')
  }
  if (st.isDirectory()) throw new Error('Cannot read folder content')

  const content = await fsp.readFile(abs, 'utf8')

  const parent = dirname(fullPath)
  const parentPath = parent === '.' ? '/' : parent

  return {
    id,
    name: basename(fullPath),
    type: 'file',
    path: parentPath === '/' ? '/' : parentPath,
    size: st.size,
    modifiedAt: st.mtime,
    content,
  }
}

export async function writeWorkspaceFileById(id: string, content: string): Promise<WorkspaceEntryWithContent> {
  if (WORKSPACE_READ_ONLY) {
    throw new WorkspaceReadOnlyError()
  }

  const fullPath = decodeWorkspaceId(id)
  const res = validateWorkspacePath(fullPath)
  if (!res.valid || !res.resolvedPath) throw new Error(res.error || 'Invalid path')

  const abs = res.resolvedPath

  // Ensure safe directory creation without symlink traversal.
  await ensureSafeDirPath(dirname(abs))

  // Refuse to follow symlinks for the target file.
  const existing = await fsp.lstat(abs).catch(() => null)
  if (existing?.isSymbolicLink()) {
    throw new Error('Refusing to write to symlink')
  }

  await fsp.writeFile(abs, content, 'utf8')

  const st = await fsp.stat(abs)

  const parent = dirname(fullPath)
  const parentPath = parent === '.' ? '/' : parent

  return {
    id,
    name: basename(fullPath),
    type: 'file',
    path: parentPath === '/' ? '/' : parentPath,
    size: st.size,
    modifiedAt: st.mtime,
    content,
  }
}

export async function ensureWorkspaceRootExists(): Promise<void> {
  const root = getWorkspaceRoot()
  await fsp.mkdir(root, { recursive: true })
}

export function isWorkspaceReadOnly(): boolean {
  return WORKSPACE_READ_ONLY
}
