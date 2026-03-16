import type { RaceEvent } from '../types'
import { minutesToHHMM } from './time'

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

export function exportScheduleAsImage(race: RaceEvent): void {
  const sorted = [...race.stints].sort((a, b) => a.plannedStartMinute - b.plannedStartMinute)
  const totalMinutes = race.durationHours * 60

  // ── Dimensions ──────────────────────────────────────────────────────────
  const SCALE = 2
  const W = 1200
  const PAD = 48

  const HEADER_H = 96
  const LEGEND_H = race.drivers.length > 0 ? 32 : 0
  const TL_LABEL_H = 18
  const TL_BAR_H = 60
  const TL_AXIS_H = 22
  const TABLE_HEAD_H = 32
  const ROW_H = 34
  const FOOTER_H = 56
  const GAP = 24

  const H =
    PAD +
    HEADER_H + GAP +
    LEGEND_H + (LEGEND_H > 0 ? GAP : 0) +
    TL_LABEL_H + TL_BAR_H + TL_AXIS_H + GAP +
    TABLE_HEAD_H + sorted.length * ROW_H + GAP +
    FOOTER_H + PAD

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // ── Palette ──────────────────────────────────────────────────────────────
  const BG       = '#0a0f1e'
  const CARD     = '#111827'
  const CARD2    = '#0d1424'
  const DIVIDER  = '#1f2937'
  const WHITE    = '#f1f5f9'
  const GRAY     = '#94a3b8'
  const MUTED    = '#4b5563'
  const ACCENT   = '#3b82f6'

  // ── Background ───────────────────────────────────────────────────────────
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // Subtle top accent stripe
  const stripe = ctx.createLinearGradient(0, 0, W, 0)
  stripe.addColorStop(0, '#1d4ed8')
  stripe.addColorStop(0.5, '#7c3aed')
  stripe.addColorStop(1, '#0ea5e9')
  ctx.fillStyle = stripe
  ctx.fillRect(0, 0, W, 3)

  let y = PAD

  // ── Header ───────────────────────────────────────────────────────────────
  // Brand
  ctx.font = `600 10px system-ui, -apple-system, sans-serif`
  ctx.letterSpacing = '2px'
  ctx.fillStyle = ACCENT
  ctx.fillText('ENDURO PLANNER', PAD, y + 14)
  ctx.letterSpacing = '0px'

  // Timestamp top-right
  ctx.font = `11px system-ui, sans-serif`
  ctx.fillStyle = MUTED
  ctx.textAlign = 'right'
  ctx.fillText(new Date().toLocaleString(), W - PAD, y + 14)
  ctx.textAlign = 'left'

  // Race name
  ctx.font = `bold 30px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = WHITE
  ctx.fillText(race.name, PAD, y + 50)

  // Subtitle
  const parts = [
    race.track && race.track,
    `${race.durationHours}h race`,
    `${race.drivers.length} driver${race.drivers.length !== 1 ? 's' : ''}`,
    `${sorted.length} stints`,
  ].filter(Boolean)
  ctx.font = `14px system-ui, sans-serif`
  ctx.fillStyle = GRAY
  ctx.fillText(parts.join('  ·  '), PAD, y + 76)

  y += HEADER_H + GAP

  // ── Driver Legend ─────────────────────────────────────────────────────────
  if (race.drivers.length > 0) {
    let lx = PAD
    for (const driver of race.drivers) {
      // Pill background
      const pillW = 28 + ctx.measureText(driver.name).width + 16
      const [r, g, b] = hexToRgb(driver.color)
      ctx.fillStyle = `rgba(${r},${g},${b},0.15)`
      roundRect(ctx, lx, y, pillW, 22, 11)
      ctx.fill()

      // Color dot
      ctx.fillStyle = driver.color
      ctx.beginPath()
      ctx.arc(lx + 12, y + 11, 5, 0, Math.PI * 2)
      ctx.fill()

      // Name
      ctx.font = `12px system-ui, sans-serif`
      ctx.fillStyle = WHITE
      ctx.fillText(driver.name, lx + 22, y + 15)

      lx += pillW + 8
      if (lx > W - PAD - 120) break // don't overflow
    }
    y += LEGEND_H + GAP
  }

  // ── Timeline Label ────────────────────────────────────────────────────────
  ctx.font = `600 10px system-ui, sans-serif`
  ctx.fillStyle = MUTED
  ctx.letterSpacing = '1px'
  ctx.fillText('STINT TIMELINE', PAD, y + 12)
  ctx.letterSpacing = '0px'
  y += TL_LABEL_H

  // Timeline bar track
  const tl_x = PAD
  const tl_w = W - PAD * 2
  ctx.fillStyle = CARD
  roundRect(ctx, tl_x, y, tl_w, TL_BAR_H, 6)
  ctx.fill()

  // Stint segments
  ctx.save()
  roundRect(ctx, tl_x, y, tl_w, TL_BAR_H, 6)
  ctx.clip()

  for (const stint of sorted) {
    const driver = race.drivers.find((d) => d.id === stint.driverId)
    if (!driver) continue

    const startPct = stint.plannedStartMinute / totalMinutes
    const widthPct = stint.plannedDurationMinutes / totalMinutes
    const sx = tl_x + startPct * tl_w
    const sw = Math.max(widthPct * tl_w, 1)

    const [r, g, b] = hexToRgb(driver.color)
    ctx.fillStyle = `rgba(${r},${g},${b},0.82)`
    ctx.fillRect(sx, y, sw, TL_BAR_H)

    // Thin divider between stints
    ctx.fillStyle = `rgba(10,15,30,0.5)`
    ctx.fillRect(sx, y, 1, TL_BAR_H)

    // Initials (if wide enough)
    if (sw > 28) {
      ctx.font = `bold 13px system-ui, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.textAlign = 'center'
      const label = sw > 50 ? driver.name.split(' ')[0] : driver.initials
      ctx.fillText(label, sx + sw / 2, y + TL_BAR_H / 2 + 5)
      ctx.textAlign = 'left'
    }
  }

  ctx.restore()

  // Hour tick marks + labels
  y += TL_BAR_H
  for (let h = 0; h <= race.durationHours; h++) {
    const hx = tl_x + (h / race.durationHours) * tl_w
    ctx.fillStyle = DIVIDER
    ctx.fillRect(hx, y, 1, 5)
    ctx.font = `10px monospace`
    ctx.fillStyle = MUTED
    ctx.textAlign = 'center'
    ctx.fillText(minutesToHHMM(h * 60), hx, y + 16)
    ctx.textAlign = 'left'
  }
  y += TL_AXIS_H + GAP

  // ── Stint Table ───────────────────────────────────────────────────────────
  const cols = {
    num:      PAD,
    driver:   PAD + 44,
    start:    PAD + 44 + 260,
    end:      PAD + 44 + 260 + 108,
    duration: PAD + 44 + 260 + 108 + 108,
    status:   PAD + 44 + 260 + 108 + 108 + 120,
  }

  // Table header
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(PAD, y, tl_w, TABLE_HEAD_H)

  ctx.font = `600 10px system-ui, sans-serif`
  ctx.fillStyle = MUTED
  ctx.letterSpacing = '0.5px'
  for (const [key, label] of Object.entries({
    num: '#', driver: 'DRIVER', start: 'START', end: 'END',
    duration: 'DURATION', status: 'STATUS',
  })) {
    ctx.fillText(label, (cols as Record<string, number>)[key] + 8, y + TABLE_HEAD_H / 2 + 4)
  }
  ctx.letterSpacing = '0px'

  y += TABLE_HEAD_H

  // Rows
  sorted.forEach((stint, i) => {
    const driver = race.drivers.find((d) => d.id === stint.driverId)
    const end = stint.plannedStartMinute + stint.plannedDurationMinutes
    const rowY = y + i * ROW_H

    ctx.fillStyle = i % 2 === 0 ? CARD : CARD2
    ctx.fillRect(PAD, rowY, tl_w, ROW_H)

    // Driver color bar on left edge
    ctx.fillStyle = driver?.color ?? '#6b7280'
    ctx.fillRect(PAD, rowY, 3, ROW_H)

    const cy = rowY + ROW_H / 2 + 5

    // Row number
    ctx.font = `12px system-ui, sans-serif`
    ctx.fillStyle = MUTED
    ctx.textAlign = 'right'
    ctx.fillText(String(i + 1), cols.num + 36, cy)
    ctx.textAlign = 'left'

    // Driver name
    ctx.font = `13px system-ui, sans-serif`
    ctx.fillStyle = WHITE
    ctx.fillText(driver?.name ?? 'Unknown', cols.driver + 8, cy)

    // Start / End / Duration (mono)
    ctx.font = `12px monospace`
    ctx.fillStyle = GRAY
    ctx.fillText(minutesToHHMM(stint.plannedStartMinute), cols.start + 8, cy)
    ctx.fillText(minutesToHHMM(end), cols.end + 8, cy)

    const durH = Math.floor(stint.plannedDurationMinutes / 60)
    const durM = stint.plannedDurationMinutes % 60
    ctx.fillText(
      durH > 0 ? `${durH}h ${String(durM).padStart(2, '0')}m` : `${durM}m`,
      cols.duration + 8, cy,
    )

    // Status pill
    ctx.font = `11px system-ui, sans-serif`
    const statusColor =
      stint.status === 'completed' ? '#22c55e'
      : stint.status === 'active'  ? '#3b82f6'
      : '#6b7280'
    ctx.fillStyle = statusColor
    ctx.fillText(stint.status, cols.status + 8, cy)
  })

  y += sorted.length * ROW_H + GAP

  // ── Footer ────────────────────────────────────────────────────────────────
  // Divider
  const grad = ctx.createLinearGradient(PAD, y, W - PAD, y)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(0.1, DIVIDER)
  grad.addColorStop(0.9, DIVIDER)
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(PAD, y, tl_w, 1)
  y += 18

  ctx.font = `11px system-ui, sans-serif`
  ctx.fillStyle = MUTED
  ctx.fillText('EnduroPlanner', PAD, y + 14)

  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.fillText(
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    W - PAD, y + 14,
  )
  ctx.textAlign = 'left'

  // ── Download ──────────────────────────────────────────────────────────────
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${race.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_stints.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
