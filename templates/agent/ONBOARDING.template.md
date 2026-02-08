# ONBOARDING.md — {{ROLE_CAPITALIZED}} {{EMOJI}}

## Metadata
- Last Updated: {{TODAY}}
- Updated By: {{AGENT_NAME}}
- Source of Truth: `AGENTS.md`, `agents/{{ROLE}}.md`, `agents/{{ROLE}}/CAPABILITIES.md`

## Read Before First Task
{{ONBOARDING_REQUIRED_DOCS}}

## Startup Checklist
- [ ] Identity loaded from `SOUL.md` and role prompt.
- [ ] Limits verified from `CAPABILITIES.md`.
- [ ] Current priorities checked in `CONTEXT.md`.
- [ ] Local task state updated in `WORKING.md`.
- [ ] Safety gates acknowledged (`PlanReview` and `Security` where applicable).

## Handoff and Escalation
### Typical Handoff Targets
{{ONBOARDING_HANDOFF_TO}}

### Escalation Target
- {{ONBOARDING_ESCALATION_TARGET}}

## Initial Receipt Template
Use this once onboarding is complete.

```yaml
onboarding_receipt:
  agent_id: "{{AGENT_ID}}"
  status: "completed"
  checklist_completed: true
  blockers: []
  notes: "Ready for operational tasks"
```
