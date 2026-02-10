import { describe, expect, it } from 'vitest'
import { parseJsonFromCommandOutput } from '../../../packages/adapters-openclaw/src/command-runner'

describe('parseJsonFromCommandOutput', () => {
  it('parses clean JSON objects', () => {
    const parsed = parseJsonFromCommandOutput<{ ok: boolean }>('{"ok":true}')
    expect(parsed).toEqual({ ok: true })
  })

  it('parses JSON when plugin logs are prefixed before payload', () => {
    const output = [
      '[plugins] [unbrowse] Auto-discover: 4 existing skills loaded',
      '[plugins] [unbrowse] Plugin registered (16 tools, auto-discover)',
      '{"service":{"runtime":{"status":"running"}}}',
    ].join('\n')

    const parsed = parseJsonFromCommandOutput<{ service: { runtime: { status: string } } }>(output)
    expect(parsed?.service.runtime.status).toBe('running')
  })

  it('parses JSON arrays with prefixed log lines', () => {
    const output = [
      '[plugins] startup complete',
      '[{"id":"alpha"},{"id":"bravo"}]',
    ].join('\n')

    const parsed = parseJsonFromCommandOutput<Array<{ id: string }>>(output)
    expect(parsed).toEqual([{ id: 'alpha' }, { id: 'bravo' }])
  })

  it('returns null when no valid JSON payload exists', () => {
    const parsed = parseJsonFromCommandOutput('not json')
    expect(parsed).toBeNull()
  })
})
