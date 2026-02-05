# Feature: Station Management with Icons

## Overview
Add station management to ClawControl's Agents page. Users should be able to create, edit, and delete stations. Each station has an icon. Agent names should display their station icon wherever they appear.

## Requirements

### 1. Database Changes
Add a `stations` table:
```sql
CREATE TABLE stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,        -- Lucide icon name (e.g., "wrench", "flask")
  description TEXT,
  color TEXT,                -- Optional: hex color for theming
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Update `agents` table:
- `station` field should reference `stations.id` (or remain as string for flexibility)

Seed default stations:
- `spec` — icon: `file-text`, "Planning & specifications"
- `build` — icon: `hammer`, "Implementation"
- `qa` — icon: `check-circle`, "Quality assurance"
- `ops` — icon: `settings`, "Operations"

### 2. UI: Agents Page Enhancement

Add a "Stations" section/tab within the Agents page:

```
┌─────────────────────────────────────────────────────────────┐
│ Agents                                                       │
├──────────────┬──────────────────────────────────────────────┤
│ [Agents Tab] │ [Stations Tab]                               │
├──────────────┴──────────────────────────────────────────────┤
│                                                              │
│  Stations                                    [+ New Station] │
│  ─────────────────────────────────────────────────────────── │
│  ┌──────┬────────────┬─────────────────────────┬──────────┐ │
│  │ Icon │ Name       │ Description             │ Actions  │ │
│  ├──────┼────────────┼─────────────────────────┼──────────┤ │
│  │ 📄   │ spec       │ Planning & specs        │ ✏️ 🗑️    │ │
│  │ 🔨   │ build      │ Implementation          │ ✏️ 🗑️    │ │
│  │ ✓    │ qa         │ Quality assurance       │ ✏️ 🗑️    │ │
│  │ ⚙️   │ ops        │ Operations              │ ✏️ 🗑️    │ │
│  └──────┴────────────┴─────────────────────────┴──────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3. Station Create/Edit Modal

```
┌─────────────────────────────────────────┐
│ Create Station                      [×] │
├─────────────────────────────────────────┤
│                                         │
│ Name:        [________________]         │
│                                         │
│ Description: [________________]         │
│                                         │
│ Icon:        [Select Icon ▼]            │
│              ┌─────────────────────┐    │
│              │ 🔧 wrench           │    │
│              │ 🔨 hammer           │    │
│              │ ⚙️ settings         │    │
│              │ ...grid of icons... │    │
│              └─────────────────────┘    │
│                                         │
│ Color:       [#3B82F6] (optional)       │
│                                         │
│         [Cancel]  [Create Station]      │
└─────────────────────────────────────────┘
```

### 4. Agent Edit: Station Assignment

When editing an agent, show a dropdown with all stations:
```
Station: [spec ▼]
         ┌──────────────────┐
         │ 📄 spec          │
         │ 🔨 build         │
         │ ✓  qa            │
         │ ⚙️ ops           │
         │ ──────────────── │
         │ + Create new...  │
         └──────────────────┘
```

### 5. Icon Display Throughout App

Wherever an agent name appears, prefix it with the station icon:
- Agent cards: `[icon] Agent Name`
- Agent lists/tables: icon in dedicated column or inline
- Work order assignments: `Assigned to: [icon] savorgbuild`
- Activity feed: `[icon] savorgbuild completed...`
- Console/chat: session labels show icon

Use Lucide React icons (already in the project).

### 6. Recommended Icon Set

Include these Lucide icons as station icon options:

**Development:**
- `hammer` — Building/construction
- `wrench` — Maintenance/fixes
- `code` — Coding
- `terminal` — CLI/ops
- `git-branch` — Version control

**Planning:**
- `file-text` — Specs/docs
- `clipboard-list` — Checklists
- `map` — Roadmap/planning
- `lightbulb` — Ideas/concepts
- `target` — Goals

**Quality:**
- `check-circle` — Approval/QA
- `shield-check` — Security
- `bug` — Bug hunting
- `test-tube` — Testing
- `microscope` — Analysis

**Operations:**
- `settings` — Configuration
- `server` — Infrastructure
- `database` — Data
- `cloud` — Cloud/deploy
- `activity` — Monitoring

**Research:**
- `flask` — Experiments
- `search` — Research
- `book-open` — Documentation
- `graduation-cap` — Learning
- `brain` — AI/ML

**Communication:**
- `message-circle` — Chat
- `mail` — Email
- `megaphone` — Announcements
- `users` — Team

**General:**
- `star` — Featured
- `zap` — Fast/priority
- `clock` — Time-based
- `folder` — Organization
- `tag` — Labels

### 7. API Endpoints

```
GET    /api/stations          — List all stations
POST   /api/stations          — Create station
GET    /api/stations/:id      — Get station
PATCH  /api/stations/:id      — Update station
DELETE /api/stations/:id      — Delete station (fail if agents assigned)
```

### 8. Migration Path

1. Create `stations` table
2. Seed default stations (spec, build, qa, ops)
3. Update existing agents to reference station IDs
4. Remove hardcoded `inferRoleAndStation()` — use DB lookup instead
5. Update agent sync to use stations from DB

### 9. Files to Modify

- `prisma/schema.prisma` — Add Station model
- `prisma/seed.ts` — Seed default stations
- `app/(dashboard)/agents/page.tsx` — Add tabs
- `app/(dashboard)/agents/stations-tab.tsx` — New component
- `components/station-icon.tsx` — Reusable icon component
- `components/agent-card.tsx` — Add icon display
- `app/api/stations/route.ts` — CRUD endpoints
- `app/api/openclaw/agents/sync/route.ts` — Remove hardcoded inference
- `lib/repo/stations.ts` — Repository layer

### 10. Acceptance Criteria

- [ ] Stations tab visible on Agents page
- [ ] Can create station with name, icon, description
- [ ] Can edit existing station
- [ ] Can delete station (blocked if agents use it)
- [ ] Icon picker shows all recommended icons in grid
- [ ] Agent edit modal has station dropdown
- [ ] Station icons appear next to agent names in:
  - [ ] Agent cards
  - [ ] Agent list/table
  - [ ] Work order detail (assignments)
  - [ ] Activity feed
  - [ ] Console session list
- [ ] Sync from OpenClaw uses station from DB (not hardcoded)
- [ ] Default stations seeded on fresh install

