/**
 * AI Model Constants
 *
 * Available models for agent configuration.
 * Uses OpenClaw format: provider/model-id
 */

export const AVAILABLE_MODELS = [
  {
    id: 'anthropic/claude-opus-4-5',
    name: 'Opus 4.5',
    shortName: 'Opus',
    description: 'Most capable, complex tasks',
    color: 'progress',
  },
  {
    id: 'anthropic/claude-sonnet-4-5',
    name: 'Sonnet 4.5',
    shortName: 'Sonnet',
    description: 'Fast, balanced performance',
    color: 'info',
  },
  {
    id: 'anthropic/claude-3-5-haiku-20241022',
    name: 'Haiku 3.5',
    shortName: 'Haiku',
    description: 'Fastest, most efficient',
    color: 'success',
  },
  {
    id: 'openai-codex/gpt-5.2',
    name: 'Codex GPT-5.2',
    shortName: 'Codex',
    description: 'Code-focused (ChatGPT Plus)',
    color: 'default',
  },
  {
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2',
    shortName: 'GPT-5.2',
    description: 'OpenAI API',
    color: 'default',
  },
] as const

export type ModelId = (typeof AVAILABLE_MODELS)[number]['id']
export type ModelColor = (typeof AVAILABLE_MODELS)[number]['color']

export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5'

/**
 * Get model info by ID
 */
export function getModelById(id: string | null | undefined): (typeof AVAILABLE_MODELS)[number] | undefined {
  if (!id) return undefined
  return AVAILABLE_MODELS.find((m) => m.id === id)
}

/**
 * Get display name for a model ID
 */
export function getModelDisplayName(id: string | null | undefined): string {
  const model = getModelById(id)
  if (model) return model.name
  // Try to parse unknown model IDs
  if (id) {
    const parts = id.split('/')
    return parts.length > 1 ? parts[1] : id
  }
  return 'Unknown'
}

/**
 * Get short name for a model ID (for badges)
 */
export function getModelShortName(id: string | null | undefined): string {
  const model = getModelById(id)
  if (model) return model.shortName
  // Try to parse unknown model IDs
  if (id) {
    const parts = id.split('/')
    const name = parts.length > 1 ? parts[1] : id
    // Shorten common patterns
    if (name.includes('opus')) return 'Opus'
    if (name.includes('sonnet')) return 'Sonnet'
    if (name.includes('haiku')) return 'Haiku'
    if (name.includes('gpt')) return 'GPT'
    return name.slice(0, 10)
  }
  return '?'
}
