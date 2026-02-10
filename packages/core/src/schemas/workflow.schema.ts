/**
 * Workflow configuration schema used by Manager Stage Engine.
 */

export const WORKFLOW_ID_PATTERN = '^[a-z][a-z0-9_-]{2,63}$'
export const WORKFLOW_STAGE_REF_PATTERN = '^[a-z][a-z0-9_-]{1,63}$'

export type WorkflowStageType = 'single' | 'loop'

export interface WorkflowLoopConfig {
  over: 'stories'
  completion: 'all_done'
  verifyEach?: boolean
  verifyStageRef?: string
  maxStories?: number
}

export interface WorkflowStageConfig {
  ref: string
  agent: string
  condition?: string
  optional?: boolean
  loopTarget?: string
  maxIterations?: number
  canVeto?: boolean
  type?: WorkflowStageType
  loop?: WorkflowLoopConfig
}

export interface WorkflowConfig {
  id: string
  description: string
  stages: WorkflowStageConfig[]
}

export interface WorkflowSelectionRule {
  id: string
  workflowId: string
  priority?: string[]
  tagsAny?: string[]
  titleKeywordsAny?: string[]
  goalKeywordsAny?: string[]
  precedes?: string[]
}

export interface WorkflowSelectionConfig {
  defaultWorkflowId: string
  rules: WorkflowSelectionRule[]
}

export const WORKFLOW_STAGE_SCHEMA = {
  type: 'object',
  required: ['ref', 'agent'],
  properties: {
    ref: { type: 'string', pattern: WORKFLOW_STAGE_REF_PATTERN },
    agent: { type: 'string', minLength: 1 },
    condition: { type: 'string' },
    optional: { type: 'boolean' },
    loopTarget: { type: 'string', pattern: WORKFLOW_STAGE_REF_PATTERN },
    maxIterations: { type: 'integer', minimum: 0, maximum: 20 },
    canVeto: { type: 'boolean' },
    type: { type: 'string', enum: ['single', 'loop'] },
    loop: {
      type: 'object',
      required: ['over', 'completion'],
      properties: {
        over: { type: 'string', enum: ['stories'] },
        completion: { type: 'string', enum: ['all_done'] },
        verifyEach: { type: 'boolean' },
        verifyStageRef: { type: 'string', pattern: WORKFLOW_STAGE_REF_PATTERN },
        maxStories: { type: 'integer', minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const

export const WORKFLOW_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['id', 'description', 'stages'],
  properties: {
    id: { type: 'string', pattern: WORKFLOW_ID_PATTERN },
    description: { type: 'string', minLength: 1, maxLength: 500 },
    stages: {
      type: 'array',
      minItems: 1,
      items: WORKFLOW_STAGE_SCHEMA,
    },
  },
  additionalProperties: false,
} as const

export const WORKFLOW_SELECTION_RULE_SCHEMA = {
  type: 'object',
  required: ['id', 'workflowId'],
  properties: {
    id: { type: 'string', pattern: WORKFLOW_ID_PATTERN },
    workflowId: { type: 'string', pattern: WORKFLOW_ID_PATTERN },
    priority: {
      type: 'array',
      items: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
    },
    tagsAny: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    titleKeywordsAny: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    goalKeywordsAny: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    precedes: {
      type: 'array',
      items: { type: 'string', pattern: WORKFLOW_ID_PATTERN },
    },
  },
  additionalProperties: false,
} as const

export const WORKFLOW_SELECTION_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['defaultWorkflowId', 'rules'],
  properties: {
    defaultWorkflowId: { type: 'string', pattern: WORKFLOW_ID_PATTERN },
    rules: {
      type: 'array',
      items: WORKFLOW_SELECTION_RULE_SCHEMA,
    },
  },
  additionalProperties: false,
} as const
