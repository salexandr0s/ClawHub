import { NextRequest, NextResponse } from 'next/server'
import { getRepos } from '@/lib/repo'
import type { OperationFilters } from '@/lib/repo'
import { withRouteTiming } from '@/lib/perf/route-timing'

/**
 * GET /api/operations
 *
 * List operations with optional filters
 */
const getOperationsRoute = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams

  const filters: OperationFilters = {}

  // Work order filter
  const workOrderId = searchParams.get('workOrderId')
  if (workOrderId) {
    filters.workOrderId = workOrderId
  }

  // Station filter (can be comma-separated)
  const station = searchParams.get('station')
  if (station) {
    filters.station = station.includes(',') ? station.split(',') : station
  }

  // Status filter (can be comma-separated)
  const status = searchParams.get('status')
  if (status) {
    filters.status = status.includes(',') ? status.split(',') : status
  }

  // Limit
  const limitStr = searchParams.get('limit')
  const limit = limitStr ? parseInt(limitStr, 10) : 100

  try {
    const repos = getRepos()
    let data = await repos.operations.list(filters)

    // Apply limit
    data = data.slice(0, limit)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[api/operations] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch operations' },
      { status: 500 }
    )
  }
}

export const GET = withRouteTiming('api.operations.get', getOperationsRoute)

/**
 * POST /api/operations
 *
 * Manual operation graph mutation is disabled in manager-only execution mode.
 */
const postOperationsRoute = async (request: NextRequest) => {
  void request
  return NextResponse.json(
    {
      error: 'Manual operation graph creation is manager-controlled',
      code: 'MANAGER_CONTROLLED_OPERATION_GRAPH',
    },
    { status: 410 }
  )
}

export const POST = withRouteTiming('api.operations.post', postOperationsRoute)
