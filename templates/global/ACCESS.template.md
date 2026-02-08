# ACCESS.md — Project Access Map

## Metadata
- Last Updated: {{TODAY}}
- Updated By: {{OWNER}}
- Source of Truth: `AGENTS.md`, `clawcontrol.config.yaml`

## Entry Points
- Main governance: `AGENTS.md`
- System identity: `SOUL.md`
- Heartbeat rules: `HEARTBEAT.md`
- Agent prompts: `agents/*.md`
- Agent runtime docs: `agents/<role>/*.md`

## Roles and Trust Boundaries
- CEO: owner-facing strategy and final external messaging.
- Manager: workflow orchestration and stage gates.
- Guard/Security: input protection and veto authority.
- Specialists: plan, build, review, UI, ops, research.

## Write Access Expectations
- Agent-local state belongs in `agents/<role>/WORKING.md` and `agents/<role>/MEMORY.md`.
- Long-term shared memory belongs in project memory files.
- Dangerous or external actions require explicit approval.

## External Interfaces
- OpenClaw CLI and gateways are authoritative execution surfaces.
- Dashboard APIs in `apps/clawcontrol/app/api/*` are control-plane interfaces.
