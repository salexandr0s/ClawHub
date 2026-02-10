import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

function parseJsonArray(input: string): string[] {
  try {
    const parsed = JSON.parse(input) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

/**
 * GET /api/operations/:id/stories
 *
 * Returns loop/story execution state for the operation.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id: operationId } = await context.params

  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
    select: { id: true },
  })
  if (!operation) {
    return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
  }

  const stories = await prisma.operationStory.findMany({
    where: { operationId },
    orderBy: { storyIndex: 'asc' },
  })

  return NextResponse.json({
    data: stories.map((story) => ({
      id: story.id,
      operationId: story.operationId,
      workOrderId: story.workOrderId,
      storyIndex: story.storyIndex,
      storyKey: story.storyKey,
      title: story.title,
      description: story.description,
      acceptanceCriteria: parseJsonArray(story.acceptanceCriteriaJson),
      status: story.status,
      output: story.outputJson,
      retryCount: story.retryCount,
      maxRetries: story.maxRetries,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    })),
  })
}
