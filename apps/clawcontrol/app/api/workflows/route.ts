import { NextResponse } from 'next/server'
import { listWorkflowConfigs } from '@/lib/workflows/registry'

export async function GET() {
  const workflows = await listWorkflowConfigs()

  return NextResponse.json({
    data: workflows,
  })
}
