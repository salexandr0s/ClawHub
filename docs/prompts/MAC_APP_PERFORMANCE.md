# Bug Fix: Mac App Performance Issue

## Problem

When the ClawControl Mac app is open, the entire system becomes slow. As soon as the app is closed, performance returns to normal.

## Root Cause Analysis

1. **Health check endpoint returns too much data**
   - `/api/maintenance` returns ~9KB of JSON
   - Health checks run every 2s (disconnected) or 10s (connected)
   - This includes full OpenClaw gateway status, all agent sessions, etc.

2. **WebView overhead**
   - WKWebView rendering a full React/Next.js app
   - Combined with frequent health checks, causes CPU spike

## Files to Modify

### 1. Create lightweight health endpoint

**File:** `apps/clawcontrol/app/api/health/route.ts` (new file)

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  // Minimal response for health checks
  return NextResponse.json({ ok: true, ts: Date.now() })
}
```

### 2. Update Mac app to use lightweight endpoint

**File:** `apps/clawcontrol-mac/clawcontrol/Services/AppState.swift`

Change:
```swift
private let baseURL = URL(string: "http://127.0.0.1:3000/api/maintenance")!
```

To:
```swift
private let baseURL = URL(string: "http://127.0.0.1:3000/api/health")!
```

### 3. Increase health check interval

**File:** `apps/clawcontrol-mac/clawcontrol/Services/AppState.swift`

Change:
```swift
let interval: UInt64 = connectionState == .connected ? 10_000_000_000 : 2_000_000_000
```

To:
```swift
// Connected: 30 seconds, Disconnected: 5 seconds
let interval: UInt64 = connectionState == .connected ? 30_000_000_000 : 5_000_000_000
```

### 4. (Optional) Add connection debouncing

If the app still hammers the server on reconnect, add exponential backoff:

```swift
private var consecutiveFailures = 0
private let maxBackoff: UInt64 = 30_000_000_000 // 30 seconds

// In health check loop:
if connectionState != .connected {
    consecutiveFailures += 1
    let backoff = min(UInt64(pow(2.0, Double(consecutiveFailures))) * 1_000_000_000, maxBackoff)
    try? await Task.sleep(nanoseconds: backoff)
} else {
    consecutiveFailures = 0
}
```

## Testing

1. Build the Mac app: `cd apps/clawcontrol-mac && ./build.sh Release`
2. Start backend: `cd apps/clawcontrol && npm run start`
3. Open the app and monitor:
   - Activity Monitor → CPU usage should stay low
   - Network tab → health checks should be small/infrequent
4. Test disconnect/reconnect cycle

## Acceptance Criteria

- [ ] `/api/health` returns `{"ok":true,"ts":...}` (~30 bytes)
- [ ] Mac app uses `/api/health` instead of `/api/maintenance`
- [ ] Health check interval: 30s connected, 5s disconnected
- [ ] CPU usage stays < 5% when app is idle
- [ ] No system slowdown with app open
