# PERFORMANCE_OPTIMIZATION_AUDIT.md

## Context
You are optimizing **ClawControl**, a Next.js 16 + SQLite local-first app for multi-agent orchestration. The app runs on `localhost:3000` and communicates with an OpenClaw gateway via WebSocket/HTTP.

**Stack:**
- Next.js 16.1.6 (App Router)
- React 19
- SQLite (Prisma ORM) with FTS5
- TailwindCSS + shadcn/ui
- Zustand for client state
- WebSocket for real-time updates

**Repo:** `~/clawd/projects/savORG/`
**Main app:** `apps/clawcontrol/`

---

## Your Mission
Perform a comprehensive performance audit and implement optimizations. Focus on real, measurable improvements — not premature optimization.

---

## 1. Bundle Analysis

### Audit
```bash
cd apps/clawcontrol
npm run build
# Check .next/analyze if available, or:
npx @next/bundle-analyzer
```

### Look For
- [ ] Large dependencies that could be lazy-loaded
- [ ] Duplicate packages in bundle
- [ ] Unused exports (tree-shaking issues)
- [ ] Heavy icons library (lucide-react) — are we importing the whole thing?
- [ ] Syntax highlighter (shiki) bundle size — lazy load?
- [ ] Date libraries (date-fns vs dayjs vs native)

### Implement
- Dynamic imports for heavy components:
  ```tsx
  const CodeBlock = dynamic(() => import('@/components/prompt-kit/code-block'), {
    loading: () => <div className="animate-pulse h-20 bg-bg-2 rounded" />
  })
  ```
- Optimize lucide imports:
  ```tsx
  // BAD
  import { Icon1, Icon2, ... } from 'lucide-react'
  
  // GOOD (if tree-shaking fails)
  import Icon1 from 'lucide-react/dist/esm/icons/icon1'
  ```

---

## 2. React Rendering Optimization

### Audit
```bash
# Add React DevTools Profiler
# Check for unnecessary re-renders
```

### Look For
- [ ] Components re-rendering on every state change
- [ ] Missing `React.memo()` on list items
- [ ] Missing `useMemo()` / `useCallback()` for expensive computations
- [ ] Context providers causing cascade re-renders
- [ ] Large lists without virtualization

### Implement
- Memoize expensive list items:
  ```tsx
  const AgentCard = React.memo(function AgentCard({ agent }: Props) {
    // ...
  })
  ```
- Virtualize long lists (sessions, logs, activities):
  ```tsx
  import { useVirtualizer } from '@tanstack/react-virtual'
  ```
- Split contexts to prevent cascade updates
- Use `useDeferredValue` for search inputs

---

## 3. Data Fetching Optimization

### Audit
```bash
# Check Network tab for:
# - Duplicate requests
# - Waterfall patterns
# - Large payloads
# - Missing caching
```

### Look For
- [ ] Same data fetched multiple times
- [ ] Sequential requests that could be parallel
- [ ] Fetching full objects when only IDs needed
- [ ] Missing `stale-while-revalidate` patterns
- [ ] No request deduplication

### Implement
- Parallel data fetching:
  ```tsx
  // BAD
  const agents = await getAgents()
  const sessions = await getSessions()
  
  // GOOD
  const [agents, sessions] = await Promise.all([
    getAgents(),
    getSessions()
  ])
  ```
- Add SWR or React Query for client-side caching:
  ```tsx
  const { data, isLoading } = useSWR('/api/agents', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000
  })
  ```
- Implement API response caching headers

---

## 4. Database Optimization

### Audit
```bash
# Check query performance
sqlite3 apps/clawcontrol/data/mission-control.db
.timer on
# Run typical queries and check timing
```

### Look For
- [ ] Missing indexes on frequently queried columns
- [ ] N+1 query patterns in Prisma
- [ ] Large result sets without pagination
- [ ] Unused indexes bloating DB
- [ ] FTS5 queries not using proper syntax

### Implement
- Add indexes:
  ```prisma
  model Operation {
    // ...
    @@index([workOrderId])
    @@index([status])
    @@index([createdAt])
  }
  ```
- Fix N+1 with includes:
  ```tsx
  // BAD
  const orders = await prisma.workOrder.findMany()
  for (const order of orders) {
    const ops = await prisma.operation.findMany({ where: { workOrderId: order.id }})
  }
  
  // GOOD
  const orders = await prisma.workOrder.findMany({
    include: { operations: true }
  })
  ```
- Add pagination to all list endpoints
- Use `select` to fetch only needed fields

---

## 5. Real-time & WebSocket Optimization

### Audit
```bash
# Check WebSocket traffic in Network tab
# Look for message frequency and size
```

### Look For
- [ ] Too frequent polling (should be event-driven)
- [ ] Large payloads over WebSocket
- [ ] Missing reconnection backoff
- [ ] Duplicate event subscriptions
- [ ] Not unsubscribing on unmount

### Implement
- Debounce high-frequency updates:
  ```tsx
  const debouncedUpdate = useMemo(
    () => debounce((data) => setState(data), 100),
    []
  )
  ```
- Implement delta updates instead of full refreshes
- Add connection pooling/reuse
- Proper cleanup on unmount:
  ```tsx
  useEffect(() => {
    const unsub = subscribe(handler)
    return () => unsub()
  }, [])
  ```

---

## 6. Image & Asset Optimization

### Audit
```bash
# Check for unoptimized images
find apps/clawcontrol -name "*.png" -o -name "*.jpg" | xargs ls -la
```

### Look For
- [ ] Large uncompressed images
- [ ] Missing Next.js Image component usage
- [ ] Icons as images instead of SVG/components
- [ ] Missing lazy loading for below-fold images

### Implement
- Use Next.js Image:
  ```tsx
  import Image from 'next/image'
  <Image src="/logo.png" width={32} height={32} alt="Logo" />
  ```
- Convert PNGs to WebP where possible
- Inline critical SVGs

---

## 7. CSS & Styling Optimization

### Audit
```bash
# Check CSS bundle size
ls -la apps/clawcontrol/.next/static/css/
```

### Look For
- [ ] Unused Tailwind classes (run purge)
- [ ] Duplicate styles
- [ ] CSS-in-JS runtime overhead
- [ ] Large animation libraries

### Implement
- Ensure Tailwind purge is configured:
  ```js
  // tailwind.config.js
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}']
  ```
- Remove unused component styles
- Use CSS transforms instead of JS animations where possible

---

## 8. Server Components vs Client Components

### Audit
```bash
# Find all 'use client' directives
grep -r "use client" apps/clawcontrol/app --include="*.tsx" | wc -l
```

### Look For
- [ ] Client components that could be server components
- [ ] Large components marked 'use client' unnecessarily
- [ ] Client components importing server-only code

### Implement
- Move data fetching to server components
- Split components: server wrapper + client interactive parts
- Use server actions for mutations where appropriate

---

## 9. Caching Strategy

### Audit
Check current caching:
```bash
grep -r "cache\|revalidate\|stale" apps/clawcontrol/app/api
```

### Implement
- Route segment caching:
  ```tsx
  export const revalidate = 60 // seconds
  ```
- API response caching:
  ```tsx
  return Response.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=10, stale-while-revalidate=30'
    }
  })
  ```
- Static generation where possible:
  ```tsx
  export const dynamic = 'force-static'
  ```

---

## 10. Startup & Cold Boot Optimization

### Audit
```bash
# Measure cold start time
time npm run start --workspace=clawcontrol
# Check instrumentation.ts
```

### Look For
- [ ] Heavy initialization on boot
- [ ] Synchronous operations blocking startup
- [ ] Unnecessary eager loading

### Implement
- Lazy initialize non-critical services
- Defer FTS index rebuilds to background
- Use connection pooling for DB

---

## Deliverables

After completing the audit, provide:

1. **OPTIMIZATION_REPORT.md** with:
   - Current metrics (bundle size, load times, DB query times)
   - Issues found (prioritized by impact)
   - Implemented fixes with before/after metrics

2. **Commits** for each optimization category

3. **Updated package.json** if dependencies changed

---

## Priority Matrix

| Impact | Effort | Priority |
|--------|--------|----------|
| High   | Low    | 🔴 Do First |
| High   | High   | 🟡 Plan Carefully |
| Low    | Low    | 🟢 Quick Wins |
| Low    | High   | ⚪ Skip |

Focus on 🔴 and 🟢 items first.

---

## Measurement Commands

```bash
# Bundle size
du -sh apps/clawcontrol/.next

# Build time
time npm run build --workspace=clawcontrol

# Start time  
time npm run start --workspace=clawcontrol &
sleep 5 && curl -s http://127.0.0.1:3000 > /dev/null && echo "Ready"

# Database size
ls -la apps/clawcontrol/data/*.db

# Lighthouse (if available)
npx lighthouse http://127.0.0.1:3000 --output=json --output-path=./lighthouse.json
```

---

## Constraints

- Don't break existing functionality
- Maintain TypeScript strict mode
- Keep the local-first architecture
- Test after each change
- Commit incrementally with clear messages
