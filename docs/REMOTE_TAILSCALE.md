# Remote Access via Tailscale Tunnel (Supported)

ClawControl stays local-only at all times.
The service must bind to loopback only (`127.0.0.1` / `::1`).

Use Tailscale as a transport for SSH tunneling, not for exposing the service directly.

## Requirements
- Host machine runs ClawControl locally on `127.0.0.1:3000`
- Host and remote machine are both connected to the same tailnet
- SSH access from remote machine to host machine over tailnet

## Host machine
Start ClawControl normally. Do not change bind host.

```bash
# Example: desktop app auto-starts local server
open -a ClawControl

# Or web run
./start.sh --web
```

Verify loopback-only bind:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
# EXPECT: 127.0.0.1:3000 only
```

## Remote machine
Create a local SSH tunnel to the host:

```bash
ssh -L 3000:127.0.0.1:3000 user@host-tailnet-name
```

Then open:

- `http://127.0.0.1:3000`

on the remote machine.

## Not allowed
- `tailscale serve` for ClawControl ports
- Binding ClawControl to `0.0.0.0`
- Reverse proxy exposure (nginx/caddy) to LAN/WAN
- Public tunneling services (ngrok/cloudflared)

## Security notes
- Tunnel access is explicit and user-initiated.
- ClawControl remains loopback-only on host even when remote control is used.
- Keep SSH keys and tailnet ACLs restricted to trusted operators.
