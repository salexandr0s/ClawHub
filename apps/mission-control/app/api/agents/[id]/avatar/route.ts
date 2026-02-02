import { NextRequest, NextResponse } from 'next/server'
import { getRepos, isMockData } from '@/lib/repo'
import { enforceTypedConfirm } from '@/lib/with-governor'
import { generateIdenticonSvg } from '@/lib/avatar'
import { validateWorkspacePath } from '@/lib/fs/path-policy'
import { promises as fsp } from 'node:fs'
import { dirname } from 'node:path'
import sharp from 'sharp'

interface RouteContext {
  params: Promise<{ id: string }>
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2MB
const MAX_AVATAR_DIM = 512
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

function parseBase64DataUrl(dataUrl: string): { mime: string; buf: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  const mime = match[1]
  const b64 = match[2]
  const buf = Buffer.from(b64, 'base64')
  return { mime, buf }
}

/**
 * GET /api/agents/:id/avatar
 * Returns an SVG identicon by default, or a custom uploaded avatar if configured.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const repos = getRepos()
  const agent = await repos.agents.getById(id)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Mock mode: always use generated SVG
  if (isMockData()) {
    const svg = generateIdenticonSvg(agent.name, { size: 96 })
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // Custom avatar (stored as PNG)
  if (agent.avatarPath) {
    const res = validateWorkspacePath(agent.avatarPath)
    if (res.valid && res.resolvedPath) {
      try {
        const buf = await fsp.readFile(res.resolvedPath)
        return new NextResponse(buf, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      } catch {
        // fall through to generated
      }
    }
  }

  const svg = generateIdenticonSvg(agent.name, { size: 96 })
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

/**
 * POST /api/agents/:id/avatar
 * Upload an avatar data URL (png/jpeg/webp). We validate and convert to PNG.
 *
 * Body: { dataUrl: string, typedConfirmText?: string }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const dataUrl = (body as Record<string, unknown>).dataUrl
  const typedConfirmText = (body as Record<string, unknown>).typedConfirmText

  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'dataUrl (data:image/...) is required' }, { status: 400 })
  }

  const parsed = parseBase64DataUrl(dataUrl)
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid data URL (expected base64)' }, { status: 400 })
  }

  if (!ALLOWED_MIME.has(parsed.mime)) {
    return NextResponse.json(
      { error: `Unsupported avatar MIME type: ${parsed.mime}. Allowed: png, jpeg, webp` },
      { status: 400 }
    )
  }

  if (parsed.buf.byteLength > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: 'Avatar too large (max 2MB)' }, { status: 400 })
  }

  const repos = getRepos()
  const agent = await repos.agents.getById(id)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Gated: writing to disk + changing agent config
  const confirm = await enforceTypedConfirm({
    actionKind: 'agent.edit',
    typedConfirmText: typeof typedConfirmText === 'string' ? typedConfirmText : undefined,
  })
  if (!confirm.allowed) {
    return NextResponse.json(
      { error: confirm.errorType, policy: confirm.policy },
      { status: confirm.errorType === 'TYPED_CONFIRM_REQUIRED' ? 428 : 403 }
    )
  }

  // Validate dimensions (reject if larger than MAX_AVATAR_DIM)
  const img = sharp(parsed.buf, { failOn: 'error', limitInputPixels: MAX_AVATAR_DIM * MAX_AVATAR_DIM })
  const meta = await img.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0

  if (!width || !height) {
    return NextResponse.json({ error: 'Could not read image dimensions' }, { status: 400 })
  }

  if (width > MAX_AVATAR_DIM || height > MAX_AVATAR_DIM) {
    return NextResponse.json(
      { error: `Avatar dimensions too large (max ${MAX_AVATAR_DIM}x${MAX_AVATAR_DIM})` },
      { status: 400 }
    )
  }

  // Convert to PNG (strip metadata)
  const pngBuf = await img.png({ compressionLevel: 9, force: true }).toBuffer()

  // Store under /agents/avatars/<agentId>.png
  const avatarPath = `/agents/avatars/${agent.id}.png`
  const v = validateWorkspacePath(avatarPath)
  if (!v.valid || !v.resolvedPath) {
    return NextResponse.json({ error: v.error || 'Invalid avatar path' }, { status: 400 })
  }

  await fsp.mkdir(dirname(v.resolvedPath), { recursive: true })
  await fsp.writeFile(v.resolvedPath, pngBuf)

  const updated = await repos.agents.update(id, {
    avatarPath,
  })

  return NextResponse.json({ data: updated })
}

/**
 * DELETE /api/agents/:id/avatar
 * Reset avatar back to identicon by clearing avatarPath (and best-effort removing file).
 *
 * Body: { typedConfirmText?: string }
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const body: unknown = await request.json().catch(() => null)
  const typedConfirmText =
    body && typeof body === 'object' ? (body as Record<string, unknown>).typedConfirmText : undefined

  const repos = getRepos()
  const agent = await repos.agents.getById(id)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const confirm = await enforceTypedConfirm({
    actionKind: 'agent.edit',
    typedConfirmText: typeof typedConfirmText === 'string' ? typedConfirmText : undefined,
  })
  if (!confirm.allowed) {
    return NextResponse.json(
      { error: confirm.errorType, policy: confirm.policy },
      { status: confirm.errorType === 'TYPED_CONFIRM_REQUIRED' ? 428 : 403 }
    )
  }

  // Best-effort delete file
  if (agent.avatarPath) {
    const v = validateWorkspacePath(agent.avatarPath)
    if (v.valid && v.resolvedPath) {
      await fsp.unlink(v.resolvedPath).catch(() => undefined)
    }
  }

  const updated = await repos.agents.update(id, { avatarPath: null })
  return NextResponse.json({ data: updated })
}
