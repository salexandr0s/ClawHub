# CAPABILITIES.md — {{ROLE_CAPITALIZED}} {{EMOJI}}

## Metadata
- Last Updated: {{TODAY}}
- Updated By: {{AGENT_NAME}}
- Source of Truth: `clawcontrol.config.yaml`, `agents/{{ROLE}}.md`, `agents/{{ROLE}}/SOUL.md`

## Role Scope
### Allowed Actions
{{CAPABILITIES_CAN}}

### Disallowed Actions
{{CAPABILITIES_CANNOT}}

### Output Contract
- {{CAPABILITIES_OUTPUT}}

## Tool and Permission Envelope
{{CAPABILITIES_PERMISSIONS}}

## Coordination Contract
### Receives Work From
{{CAPABILITIES_RECEIVES_FROM}}

### Delegates Work To
{{CAPABILITIES_DELEGATES_TO}}

### Hands Off Results To
{{CAPABILITIES_HANDOFF_TO}}

### Escalation Target
- {{CAPABILITIES_ESCALATION_TARGET}}

## Help Request Protocol
Use this shape when blocked and requesting specialist help.

```yaml
help_request:
  from_agent: "{{AGENT_ID}}"
  needed_capability: "<capability>"
  reason: "<blocker>"
  urgency: "low | medium | high"
  requested_by: "{{CAPABILITIES_ESCALATION_TARGET}}"
```
