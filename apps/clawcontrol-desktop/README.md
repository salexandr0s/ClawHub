# ClawControl Desktop (Electron)

This is a lightweight Electron wrapper around the existing ClawControl web app.

## Prereqs
- None for normal usage: the app will auto-start the local server on `http://127.0.0.1:3000` if it isn’t already running.
- If something else is using port `3000`, the app will show an error and exit.

## Remote control (Tailscale tunnel)
- Keep ClawControl local-only on the host (`127.0.0.1:3000`).
- Use SSH tunneling over Tailscale from the remote machine:

```bash
ssh -L 3000:127.0.0.1:3000 user@host-tailnet-name
```

- Open `http://127.0.0.1:3000` on the remote machine.
- Never use `tailscale serve` for ClawControl ports.

See [`../../docs/REMOTE_TAILSCALE.md`](../../docs/REMOTE_TAILSCALE.md) for the full policy.

## Generate icons
```bash
./scripts/build-icons.sh
```

## Dev
```bash
# Start Electron (it spawns the backend automatically):
npm run dev --workspace=clawcontrol-desktop
```

## Build
```bash
npm run build:mac --workspace=clawcontrol-desktop
# or: build:win, build:linux
```

Artifacts will be emitted under `apps/clawcontrol-desktop/dist/release/`.
