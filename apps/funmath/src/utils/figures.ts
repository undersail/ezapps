// 几何图形 SVG 渲染器
// 输入结构化的 FigureSpec，输出 SVG 字符串
// 风格：浅绿渐变 + 绿色描边 + 尺寸标注

import type { FigureSpec } from '../types'

const VIEW_W = 160
const VIEW_H = 120
const ACCENT = '#10b981'
const ACCENT_LIGHT = 'rgba(16, 185, 129, 0.12)'
const LABEL_COLOR = '#047857'

/** 通用样式：让 SVG 响应式 */
const WRAPPER = 'xmlns="http://www.w3.org/2000/svg"'

export function renderFigureSvg(figure: FigureSpec): string {
  switch (figure.type) {
    case 'rect':       return renderRect(figure.width, figure.height)
    case 'square':     return renderSquare(figure.side)
    case 'triangle':   return renderTriangle(figure.base, figure.height, figure.sides)
    case 'parallelogram': return renderParallelogram(figure.base, figure.height)
    case 'trapezoid':  return renderTrapezoid(figure.upperBase, figure.lowerBase, figure.height)
    case 'circle':     return renderCircle(figure.radius, figure.diameter)
    case 'cube':       return renderCube(figure.length, figure.width, figure.height)
    case 'squareCube': return renderSquareCube(figure.side)
  }
}

// ==================== 2D 图形 ====================

function renderRect(w: number, h: number): string {
  const pad = 24
  const maxW = VIEW_W - pad * 2
  const maxH = VIEW_H - pad * 2
  const ratio = Math.min(maxW / w, maxH / h)
  const rw = w * ratio
  const rh = h * ratio
  const x = (VIEW_W - rw) / 2
  const y = (VIEW_H - rh) / 2

  return `
    <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" ${WRAPPER}>
      <rect x="${x}" y="${y}" width="${rw}" height="${rh}"
            fill="${ACCENT_LIGHT}" stroke="${ACCENT}" stroke-width="2" rx="2"/>
      <text x="${x + rw + 4}" y="${y + rh / 2 + 4}" font-size="11" fill="${LABEL_COLOR}" font-weight="600">${w}cm</text>
      <text x="${x + rw / 2}" y="${y - 4}" font-size="11" fill="${LABEL_COLOR}" font-weight="600" text-anchor="middle">${h}cm</text>
    </svg>
  `
}

function renderSquare(side: number): string {
  const pad = 24
  const max = VIEW_H - pad * 2
  const s = Math.min(max, VIEW_W - pad * 2)
  const x = (VIEW_W - s) / 2
  const y = (VIEW_H - s) / 2

  return `
    <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" ${WRAPPER}>
      <rect x="${x}" y="${y}" width="${s}" height="${s}"
            fill="${ACCENT_LIGHT}" stroke="${ACCENT}" stroke-width="2" rx="2"/>
      <text x="${x + s / 2}" y="${y - 4}" font-size="11" fill="${LABEL_COLOR}" font-weight="600" text-anchor="middle">${side}cm</text>
    </svg>
  `
}

function renderTriangle(base: number, height: number, sides?: number[]): string {
  // 等高三角形：顶点在上方
  const pad = 24
  const maxW = VIEW_W - pad * 2
  const maxH = VIEW_H - pad * 2
  const ratio = Math.min(maxW / base, maxH / height)
  const bw = base * ratio
  const bh = height * ratio
  const x0 = (VIEW_W - bw) / 2
  const y0 = (VIEW_H - bh) / 2 + bh  // 底边 y
  const apexX = x0 + bw / 2
  const apexY = y0 - bh

  const sidesLabels = sides
    ? `<text x="${x0 + bw + 4}" y="${y0 + 4}" font-size="10" fill="${LABEL_COLOR}">${sides[0]}cm</text>`
    : `<text x="${x0 + bw + 4}" y="${y0 + 4}" font-size="10" fill="${LABEL_COLOR}">底 ${base}cm</text>`

  return `
    <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" ${WRAPPER}>
      <polygon points="${apexX},${apexY} ${x0},${y0} ${x0 + bw},${y0}"
               fill="${ACCENT_LIGHT}" stroke="${ACCENT}" stroke-width="2"
               stroke-linejoin="round"/>
      <line x1="${apexX}" y1="${apexY}" x2="${apexX}" y2="${y0}"
            stroke="${LABEL_COLOR}" stroke-width="1" stroke-dasharray="2,2" opacity="0.5"/>
      <text x="${apexX + 4}" y="${(apexY + y0) / 2}" font-size="10" fill="${LABEL_COLOR}">高 ${height}cm</text>
      ${sidesLabels}
    </svg>
  `
}

function renderParallelogram(base: number, height: number): string {
  const pad = 24
  const maxW = VIEW_W - pad * 2
  const maxH = VIEW_H - pad * 2
  const ratio = Math.min(maxW / base, maxH / height)
  const bw = base * ratio
  const bh = height * ratio
  const offset = bw * 0.25
  const x0 = (VIEW_W - bw) / 2
  const y0 = (VIEW_H - bh) / 2 + bh
  const x1 = x0 + offset
  const y1 = y0 - bh

  return `
    <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" ${WRAPPER}>
      <polygon points="${x1},${y1} ${x0 + bw + offset},${y1} ${x0 + bw},${y0} ${x0},${y0}"
               fill="${ACCENT_LIGHT}" stroke="${ACCENT}" stroke-width="2"
               stroke-linejoin="round"/>
      <text x="${x0 + bw / 2}" y="${y0 + 12}" font-size="11" fill="${LABEL_COLOR}" font-weight="600" text-anchor="middle">底 ${base}cm</text>
      <text x="${x1 - 6}" y="${(y1 + y0) / 2 + 4}" font-size="10" fill="${LABEL_COLOR}" text-anchor="end">高 ${height}cm</text>
    </svg>
  `
}

function renderTrapezoid(upper: number, lower: number, height: number): string {
  const pad = 24
  const maxW = VIEW_W - pad * 2
  const maxH = VIEW_H - pad * 2
  const baseMax = Math.max(upper, lower)
  const ratio = Math.min(maxW / baseMax, maxH / height)
  const ub = upper * ratio
  const lb = lower * ratio
  const bh = height * ratio
  const cx = VIEW_W / 2
  const cy0 = (VIEW_H - bh) / 2 + bh
  const x1 = cx - lb / 2
  const x2 = cx + lb / 2
  const x3 = cx + ub / 2
  const x4 = cx - ub / 2

  return `
    <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" ${WRAPPER}>
      <polygon points="${x4},${cy0 - bh} ${x3},${cy0 - bh} ${x2},${cy0} ${x1},${cy0}"
               fill="${ACCENT_LIGHT}" stroke="${ACCENT}" stroke-width="2"
               stroke-linejoin="round"/>
      <text x="${(x1 + x2) / 2}" y="${cy0 + 12}" font-size="10" fill="${LABEL_COLOR}" text-anchor="middle">下 ${lower}cm</text>
      <text x="${(x3 + x4) / 2}" y="${cy0 - bh - 4}" font-size="10" fill="${LABEL_COLOR}" text-anchor="middle">上 ${upper}cm</text>
      <text x="${x1 - 4}" y="${(cy0 + (cy0 - bh)) / 2 + 4}" font-size="10" fill="${LABEL_COLOR}" text-anchor="end">高 ${height}cm</text>
    </svg>
  `
}

function renderCircle(radius?: number, diameter?: number): string {
  const pad = 24
  const r = radius ?? (diameter ? diameter / 2 : 30)
  const cx = VIEW_W / 2
  const cy = VIEW_H / 2
  const svgR = Math.min(VIEW_W, VIEW_H) / 2 - pad
  // 统一缩放，使所有圆看起来大小一致
  const scale = svgR / r
  const drawR = r * scale
  const label = radius ? 'r' : 'd'

  // 中心到右边画一条线（半径/直径示意）
  const x2 = cx + drawR
  const y2 = cy

  return `
    <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" ${WRAPPER}>
      <circle cx="${cx}" cy="${cy}" r="${drawR}"
              fill="${ACCENT_LIGHT}" stroke="${ACCENT}" stroke-width="2"/>
      <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}"
            stroke="${LABEL_COLOR}" stroke-width="1" stroke-dasharray="2,2" opacity="0.6"/>
      <circle cx="${cx}" cy="${cy}" r="2" fill="${LABEL_COLOR}"/>
      <text x="${(cx + x2) / 2}" y="${cy - 4}" font-size="11" fill="${LABEL_COLOR}" font-weight="600" text-anchor="middle">${label} = ${label === 'r' ? radius : diameter}cm</text>
    </svg>
  `
}

// ==================== 3D 图形 ====================

function renderCube(L: number, W: number, H: number): string {
  const pad = 20
  const cx = VIEW_W / 2
  const cy = VIEW_H / 2

  // 等角投影：30 度倾斜
  const skew = 0.4  // 深度偏移比例
  // 用最大边作为缩放基准
  const maxDim = Math.max(L, W, H)
  const baseScale = (Math.min(VIEW_W, VIEW_H) / 2 - pad) / maxDim
  const lw = L * baseScale
  const ww = W * baseScale
  const hw = H * baseScale
  const depth = ww * skew

  // 前面 4 个角
  const fx0 = cx - lw / 2
  const fy0 = cy + hw / 2 - depth / 2
  const fx1 = cx + lw / 2
  const fy1 = fy0

  // 后面 4 个角（向上、向右偏移）
  const bx0 = fx0 + depth
  const by0 = fy0 - depth
  const bx1 = fx1 + depth
  const by1 = fy1 - depth

  return `
    <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" ${WRAPPER}>
      <!-- 后顶面 -->
      <polygon points="${bx0},${by0} ${bx1},${by1} ${fx1},${fy1} ${fx0},${fy0}"
               fill="rgba(16, 185, 129, 0.05)" stroke="${ACCENT}" stroke-width="1.5" opacity="0.7"/>
      <!-- 右侧面 -->
      <polygon points="${fx1},${fy1} ${bx1},${by1} ${bx1},${by1 + hw} ${fx1},${fy1 + hw}"
               fill="rgba(16, 185, 129, 0.18)" stroke="${ACCENT}" stroke-width="1.5"/>
      <!-- 前面 -->
      <polygon points="${fx0},${fy0} ${fx1},${fy1} ${fx1},${fy1 + hw} ${fx0},${fy0 + hw}"
               fill="${ACCENT_LIGHT}" stroke="${ACCENT}" stroke-width="2"/>
      <!-- 标签 -->
      <text x="${(fx0 + fx1) / 2}" y="${fy1 + hw + 12}" font-size="10" fill="${LABEL_COLOR}" text-anchor="middle">长 ${L}</text>
      <text x="${fx1 + (bx1 - fx1) / 2}" y="${fy1 + hw / 2 + 4}" font-size="10" fill="${LABEL_COLOR}" text-anchor="middle">宽 ${W}</text>
      <text x="${fx0 - 4}" y="${(fy0 + fy0 + hw) / 2 + 4}" font-size="10" fill="${LABEL_COLOR}" text-anchor="end">高 ${H}</text>
    </svg>
  `
}

function renderSquareCube(side: number): string {
  return renderCube(side, side, side)
}