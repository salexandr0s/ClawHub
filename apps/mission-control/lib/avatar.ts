/**
 * Agent Avatar
 *
 * Generates deterministic "QR/identicon-style" SVG avatars based on agent name.
 * Optional custom avatars can be stored in the workspace and referenced via `agent.avatarPath`.
 */

export function hashToBytes(input: string, length = 32): number[] {
  // FNV-1a 32-bit
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }

  // Expand to bytes deterministically
  const out: number[] = []
  let x = h >>> 0
  for (let i = 0; i < length; i++) {
    // xorshift
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    x >>>= 0
    out.push(x & 0xff)
  }
  return out
}

const PALETTE = [
  '#6C8CFF', // progress
  '#56CCF2', // info
  '#2ECC71', // success
  '#F2C94C', // warning
  '#EB5757', // danger
]

export function generateIdenticonSvg(name: string, opts?: { size?: number; cells?: number }): string {
  const size = opts?.size ?? 64
  const cells = opts?.cells ?? 5
  const cellSize = Math.floor(size / cells)

  const bytes = hashToBytes(name, 64)
  const color = PALETTE[bytes[0] % PALETTE.length]

  // Symmetric grid like classic identicons
  const half = Math.ceil(cells / 2)

  const rects: string[] = []
  let idx = 1
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < half; x++) {
      const on = (bytes[idx++] % 2) === 0
      if (!on) continue

      const rx = x * cellSize
      const ry = y * cellSize
      rects.push(`<rect x="${rx}" y="${ry}" width="${cellSize}" height="${cellSize}" />`)

      const mirrorX = (cells - 1 - x) * cellSize
      if (mirrorX !== rx) {
        rects.push(`<rect x="${mirrorX}" y="${ry}" width="${cellSize}" height="${cellSize}" />`)
      }
    }
  }

  const view = size

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${view} ${view}" role="img" aria-label="${escapeXml(name)} avatar">
  <rect x="0" y="0" width="${view}" height="${view}" rx="12" fill="#101723"/>
  <g fill="${color}">
    ${rects.join('\n    ')}
  </g>
</svg>`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
