# clawcontrol Setup Guide

This guide covers setup instructions for running clawcontrol and connecting it to OpenClaw for real data.

---

## Prerequisites

### Required

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | 20+ | `node -v` |
| npm | 10+ | `npm -v` |

### Recommended (for OpenClaw-backed features)

| Tool | Version | Check Command |
|------|---------|---------------|
| OpenClaw | Latest | `openclaw --version` |

---

## Quick Install

```bash
# Clone repository
git clone https://github.com/salexandr0s/clawcontrol.git
cd clawcontrol

# Install dependencies
npm install

# Copy environment file
cp apps/clawcontrol/.env.example apps/clawcontrol/.env

# Initialize database
npm run db:migrate

# Start development server
npm run dev
```

---

## Step-by-Step Setup

### 1. Install Node.js

We recommend using [nvm](https://github.com/nvm-sh/nvm) for Node version management:

```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc  # or ~/.zshrc

# Install and use correct Node version
cd clawcontrol
nvm install
nvm use
```

This reads the `.nvmrc` file and installs Node 20.

### 2. Install Dependencies

```bash
npm install
```

This installs dependencies for:
- Root workspace
- `apps/clawcontrol` (Next.js app)
- `packages/core` (shared types and Governor)
- `packages/ui` (shared components)
- `packages/adapters-openclaw` (CLI adapter)

### 3. Configure Environment

```bash
# Copy the example environment file
cp apps/clawcontrol/.env.example apps/clawcontrol/.env
```

Edit `.env` if you need to customize:

```bash
# Required: Database location
DATABASE_URL="file:../data/clawcontrol.db"
```

### 4. Initialize Database

```bash
# Run migrations
npm run db:migrate
```

This creates the SQLite database at `apps/clawcontrol/data/clawcontrol.db` with:
- Work orders table
- Agents table
- Activities table (audit log)
- Receipts table (command logs)
- Approvals table (pending gates)

clawcontrol does not ship with seed/demo data. A fresh database will show empty states until you connect OpenClaw or create records through the UI.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Operational Mode Setup

To connect to a real OpenClaw installation:

### 1. Install OpenClaw

Follow the [OpenClaw installation guide](https://github.com/openclaw/openclaw).

### 2. Verify Installation

```bash
# Should return a path
which openclaw

# Should show version
openclaw --version
```

### 3. Configure Workspace

clawcontrol expects OpenClaw workspace structure at your current directory:

```
your-project/
├── .openclaw/
│   └── config.yaml
├── AGENTS.md
├── agents/
│   ├── <agent_id>/
│   │   ├── SOUL.md
│   │   └── HEARTBEAT.md
│   └── <agent_id>.md
├── overlays/
│   └── *.md
├── skills/
│   └── *.md
└── playbooks/
    └── *.md
```

### 4. Start clawcontrol

```bash
cd your-project
npm run dev --prefix /path/to/clawcontrol/apps/clawcontrol
```

Or symlink clawcontrol into your project for convenience.

---

## Database Management

### View Database (Prisma Studio)

```bash
npm run db:studio
```

Opens a web UI at [http://localhost:5555](http://localhost:5555).

### Reset Database

```bash
npm run db:reset
```

**Warning:** This deletes all data and re-runs migrations.

### Create New Migration

```bash
cd apps/clawcontrol
npx prisma migrate dev --name your_migration_name
```

---

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:push` | Push schema without migration history |
| `npm run db:studio` | Open Prisma Studio |

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Database Locked Error

SQLite uses file-level locking. Ensure only one process accesses the database:

1. Close Prisma Studio
2. Stop any other `npm run dev` instances
3. Retry

### OpenClaw Not Detected

clawcontrol checks `which openclaw` on startup. Ensure:

1. OpenClaw is installed
2. OpenClaw binary is on your PATH
3. Restart the development server after installing

If OpenClaw is not available, clawcontrol will still run, but OpenClaw-backed pages will show empty states and related actions will return availability errors until OpenClaw is configured.

### Type Errors After Pulling

```bash
# Clean and rebuild
npm run clean
npm install
npm run typecheck
```

---

## Next Steps

- [OpenClaw Integration](./OPENCLAW_INTEGRATION.md) - Deep dive into OpenClaw connection
- [Security Model](./SECURITY.md) - Understanding Governor and approval gates
- [Path Policy](./PATH_POLICY.md) - Workspace file safety rules
