import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getRepos } from '@/lib/repo'
import { getRequestActor } from '@/lib/request-actor'
import { checkGatewayAvailability, getWsConsoleClient } from '@/lib/openclaw/console-client'

// ============================================================================
// GET /api/openclaw/console/sessions/[id]
// ============================================================================

/**
 * Get a single session by sessionId.
 * Read-only - no governor required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  try {
    const session = await prisma.agentSession.findUnique({
      where: { sessionId },
    })

    if (!session) {
      return NextResponse.json(
        { ok: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: session.id,
        sessionId: session.sessionId,
        sessionKey: session.sessionKey,
        agentId: session.agentId,
        kind: session.kind,
        model: session.model,
        state: session.state,
        percentUsed: session.percentUsed,
        abortedLastRun: session.abortedLastRun,
        operationId: session.operationId,
        workOrderId: session.workOrderId,
        lastSeenAt: session.lastSeenAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        // Include raw JSON for debugging
        rawJson: session.rawJson ? JSON.parse(session.rawJson) : null,
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to fetch session',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE /api/openclaw/console/sessions/[id]
// ============================================================================

interface EndSessionRequestBody {
  deleteTranscript?: boolean
  sessionKey?: string
}

/**
 * End/archive a session in OpenClaw (via sessions.delete).
 *
 * This removes the live session from gateway state. For telemetry UX we also
 * remove the local cached row from agent_sessions after success.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const { actor } = getRequestActor(request)

  let body: EndSessionRequestBody = {}
  try {
    body = (await request.json()) as EndSessionRequestBody
  } catch {
    // Optional body
  }

  const deleteTranscript = body.deleteTranscript !== false
  const bodySessionKey = typeof body.sessionKey === 'string' ? body.sessionKey.trim() : ''
  const idLooksLikeSessionKey = sessionId.includes(':')

  const sessionById = await prisma.agentSession.findUnique({
    where: { sessionId },
  })
  const sessionByBodyKey = !sessionById && bodySessionKey
    ? await prisma.agentSession.findFirst({
        where: { sessionKey: bodySessionKey },
        orderBy: { updatedAt: 'desc' },
      })
    : null
  const sessionByRouteKey = !sessionById && !sessionByBodyKey && idLooksLikeSessionKey
    ? await prisma.agentSession.findFirst({
        where: { sessionKey: sessionId },
        orderBy: { updatedAt: 'desc' },
      })
    : null
  const session = sessionById ?? sessionByBodyKey ?? sessionByRouteKey
  const targetSessionKey = bodySessionKey || session?.sessionKey || (idLooksLikeSessionKey ? sessionId : '')

  if (!targetSessionKey) {
    return NextResponse.json(
      { ok: false, error: 'Session not found', code: 'SESSION_NOT_FOUND_OR_KEY_MISSING' },
      { status: 404 }
    )
  }

  const availability = await checkGatewayAvailability()
  if (!availability.available) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Gateway unavailable — cannot end session',
        code: 'GATEWAY_UNAVAILABLE',
        details: { latencyMs: availability.latencyMs, gatewayError: availability.error },
      },
      { status: 503 }
    )
  }

  const repos = getRepos()
  const startTime = Date.now()

  const receipt = await repos.receipts.create({
    workOrderId: session?.workOrderId ?? 'console',
    operationId: session?.operationId,
    kind: 'manual',
    commandName: 'console.session.end',
    commandArgs: {
      sessionId,
      sessionKey: targetSessionKey,
      agentId: session?.agentId ?? 'unknown',
      deleteTranscript,
    },
  })

  await repos.activities.create({
    type: 'openclaw.session.end',
    actor: actor || 'operator:unknown',
    entityType: 'session',
    entityId: targetSessionKey,
    summary: `End session ${targetSessionKey}`,
    payloadJson: {
      receiptId: receipt.id,
      sessionId,
      sessionKey: targetSessionKey,
      agentId: session?.agentId ?? 'unknown',
      deleteTranscript,
    },
  })

  try {
    const client = getWsConsoleClient()
    const result = await client.sessionsDelete({
      key: targetSessionKey,
      deleteTranscript,
    })

    const durationMs = Date.now() - startTime
    await repos.receipts.finalize(receipt.id, {
      exitCode: 0,
      durationMs,
      parsedJson: {
        key: result.key,
        deleted: result.deleted,
        archived: result.archived ?? [],
      },
    })

    // Keep telemetry cache aligned with gateway result.
    await prisma.agentSession.deleteMany({ where: { sessionKey: targetSessionKey } }).catch(() => {})

    return NextResponse.json({
      ok: true,
      key: result.key,
      deleted: result.deleted,
      archived: result.archived ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to end session'
    const durationMs = Date.now() - startTime
    await repos.receipts.finalize(receipt.id, {
      exitCode: 1,
      durationMs,
      parsedJson: {
        error: message,
        sessionId,
        sessionKey: targetSessionKey,
      },
    })

    const status = /cannot delete the main session|invalid sessions\.delete params|key required/i.test(message)
      ? 400
      : 500

    return NextResponse.json(
      { ok: false, error: message, code: 'SESSION_END_FAILED' },
      { status }
    )
  }
}
