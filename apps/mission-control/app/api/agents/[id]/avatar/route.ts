import { NextRequest, NextResponse } from 'next/server'
import { getRepos } from '@/lib/repo'
import { enforceTypedConfirm } from '@/lib/with-governor'
import { generateIdenticonSvg } from '@/lib/avatar'
import { isMockData } from '@/lib/repo'
import { validateWorkspacePath } from '@/lib/fs/path-policy'
import { promises as fsp } from 'node:fs'
import { dirname } from 'node:path'

interface RouteContext {
  params: Promise<{ id: string }>
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

  // Custom avatar
  if (agent.avatarPath) {
    const res = validateWorkspacePath(agent.avatarPath)
    if (res.valid && res.resolvedPath) {
      try {
        const buf = await fsp.readFile(res.resolvedPath)
        const isSvg = agent.avatarPath.toLowerCase().endsWith('.svg')
        return new NextResponse(buf, {
          headers: {
            'Content-Type': isSvg ? 'image/svg+xml; charset=utf-8' : 'image/png',
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
 * Upload a PNG data URL as the agent avatar.
 *
 * Body: { dataUrl: string, typedConfirmText?: string }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const body = await request.json()
  const { dataUrl, typedConfirmText } = body

  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'dataUrl (data:image/...) is required' }, { status: 400 })
  }

  const repos = getRepos()
  const agent = await repos.agents.getById(id)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Gated: writing to disk + changing agent config
  const confirm = await enforceTypedConfirm({
    actionKind: 'agent.edit',
    typedConfirmText,
  })
  if (!confirm.allowed) {
    return NextResponse.json(
      { error: confirm.errorType, policy: confirm.policy },
      { status: confirm.errorType === 'TYPED_CONFIRM_REQUIRED' ? 428 : 403 }
    )
  }

  // Parse base64
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    return NextResponse.json({ error: 'Invalid data URL (expected base64)' }, { status: 400 })
  }

  const mime = match[1]
  const b64 = match[2]
  const buf = Buffer.from(b64, 'base64')

  // 1MB limit
  if (buf.byteLength > 1_000_000) {
    return NextResponse.json({ error: 'Avatar too large (max 1MB)' }, { status: 400 })
  }

  // Store under /agents/avatars/<agent>.png
  const ext = mime.includes('svg') ? 'svg' : 'png'
  const avatarPath = `/agents/avatars/${agent.name}.${ext}`
  const v = validateWorkspacePath(avatarPath)
  if (!v.valid || !v.resolvedPath) {
    return NextResponse.json({ error: v.error || 'Invalid avatar path' }, { status: 400 })
  }

  await fsp.mkdir(dirname(v.resolvedPath), { recursive: true })
  await fsp.writeFile(v.resolvedPath, buf)

  const updated = await repos.agents.update(id, {
    // stored as workspace path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    avatarPath: avatarPath as any,
  })

  return NextResponse.json({ data: updated })
}
