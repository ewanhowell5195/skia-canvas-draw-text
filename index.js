import { fillText, measureText, splitText, strokeText } from "skia-canvas-with-twemoji"
import { Canvas } from "skia-canvas"

const segmenter = new Intl.Segmenter()
const aligns = ["left", "center", "right"]
const baselines = ["top", "middle", "bottom", "alphabetic", "hanging", "ideographic"]
const defaults = { fontSize: 10, minFontSize: 1, colour: "#000", location: [0, 0], align: "left", baseline: "alphabetic", lineHeight: 1, shadowColour: "#000", shadowBlur: 0, shadowOffset: [0, 0], outlineColour: "#000", outlineWidth: 0, padding: [0, 0, 0, 0] }

export function drawText(text, args = {}) {
  const options = Object.assign({}, defaults, Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined)))
  if (!aligns.includes(options.align)) throw new Error(`Invalid align "${options.align}", expected one of ${aligns.join(", ")}`)
  if (!baselines.includes(options.baseline)) throw new Error(`Invalid baseline "${options.baseline}", expected one of ${baselines.join(", ")}`)
  text = String(text).replace(/\r\n?/g, "\n")
  const measureCtx = new Canvas(1, 1).getContext("2d")
  const shadow = shadowLayout(options)
  const extraWidth = shadow.offsets[1] + shadow.offsets[3] + options.outlineWidth * 2
  const extraHeight = shadow.offsets[0] + shadow.offsets[2] + options.outlineWidth * 2
  const maxWidth = (options.maxWidth ?? (options.wrap ? options.ctx?.canvas.width : undefined) ?? Infinity) - extraWidth
  const maxHeight = (options.maxHeight ?? Infinity) - extraHeight
  const wrapWidth = options.wrap ? maxWidth : Infinity
  const fontSize = fitFontSize(options, size => {
    const layout = textLayout(text, options, measureCtx, size, wrapWidth)
    return layout.width <= maxWidth && layout.height <= maxHeight && (options.maxWidth === undefined || !layout.broke)
  })
  const layout = textLayout(text, options, measureCtx, fontSize, wrapWidth)
  const { lines, width, height, ascent, descent, pitch } = layout
  const edges = addEdges(shadow.offsets, overhang(measureCtx, lines, width, options.align, ascent, descent, options.outlineWidth))
  const [top, right, bottom, left] = edges
  const textCanvas = new Canvas(Math.max(Math.ceil(width) + right + left + options.padding[1] + options.padding[3], 1), Math.max(Math.ceil(height) + top + bottom + options.padding[0] + options.padding[2], 1))
  const textCtx = textCanvas.getContext("2d")
  textCtx.font = measureCtx.font
  textCtx.textAlign = options.align
  const anchor = alignOffset(options.align, width)
  for (const [i, line] of lines.entries()) {
    drawGlyphs(textCtx, line, left + options.padding[3] + anchor, top + options.padding[0] + ascent + pitch * i, options)
  }
  const final = withShadow(textCanvas, options, shadow)
  final.textWidth = Math.ceil(width)
  final.textHeight = Math.ceil(height)
  final.fontSize = fontSize
  final.padding = options.padding.map((e, i) => e + edges[i])
  if (options.ctx) options.ctx.drawImage(final, Math.round(options.location[0] - final.padding[3] - anchor), Math.round(options.location[1] - final.padding[0] - baselineOffset(measureCtx, options.baseline, layout)))
  return final
}

function textLayout(text, options, measureCtx, fontSize, wrapWidth) {
  measureCtx.font = fontString(options, fontSize)
  measureCtx.textBaseline = "alphabetic"
  const { lines, width, broke } = getLines(measureCtx, text, wrapWidth)
  const metrics = measureText(measureCtx, "")
  const lineHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
  const pitch = lineHeight * options.lineHeight
  return { lines, width, broke, ascent: metrics.fontBoundingBoxAscent, descent: metrics.fontBoundingBoxDescent, pitch, height: lineHeight + pitch * (lines.length - 1) }
}

function baselineOffset(measureCtx, baseline, layout) {
  const last = layout.pitch * (layout.lines.length - 1)
  if (baseline === "bottom") return last + baselineAscent(measureCtx, "bottom")
  if (baseline === "middle") return (baselineAscent(measureCtx, "top") + last + baselineAscent(measureCtx, "bottom")) / 2
  return baselineAscent(measureCtx, baseline)
}

function baselineAscent(measureCtx, baseline) {
  measureCtx.textBaseline = baseline
  return measureText(measureCtx, "").fontBoundingBoxAscent
}

function alignOffset(align, width) {
  return align === "center" ? width / 2 : align === "right" ? width : 0
}

function fitFontSize(options, fits) {
  if (fits(options.fontSize)) return options.fontSize
  let low = Math.min(options.minFontSize, options.fontSize)
  if (!fits(low)) return low
  let high = options.fontSize
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2)
    if (fits(mid)) low = mid
    else high = mid
  }
  return low
}

function drawGlyphs(ctx, text, x, y, options) {
  if (options.outlineWidth) {
    ctx.strokeStyle = options.outlineColour
    ctx.lineWidth = options.outlineWidth * 2
    ctx.lineJoin = "round"
    strokeText(ctx, text, x, y)
  }
  ctx.fillStyle = options.colour
  fillText(ctx, text, x, y)
}

function fontString(options, fontSize) {
  const family = options.fontFamily ? `"${options.fontFamily.replace(/^(["'])(.*)\1$/, "$2")}"` : "sans-serif"
  return [options.fontStyle, options.fontWeight, `${fontSize}px`, family].filter(Boolean).join(" ")
}

function shadowLayout(options) {
  const [x, y] = options.shadowOffset
  const spread = options.shadowBlur * 1.5
  return { x, y, offsets: [-y, x, y, -x].map(e => Math.max(Math.ceil(e + spread), 0)) }
}

function withShadow(canvas, options, shadow) {
  if (!options.shadowBlur && !shadow.x && !shadow.y) return canvas
  const final = new Canvas(canvas.width, canvas.height)
  const ctx = final.getContext("2d")
  ctx.shadowColor = options.shadowColour
  ctx.shadowBlur = options.shadowBlur
  ctx.shadowOffsetX = shadow.x
  ctx.shadowOffsetY = shadow.y
  ctx.drawImage(canvas, 0, 0)
  return final
}

function overhang(ctx, lines, width, align, ascent, descent, outline) {
  let top = 0
  let right = 0
  let bottom = 0
  let left = 0
  for (const [i, line] of lines.entries()) {
    const metrics = measureText(ctx, line)
    const x = alignOffset(align, width) - alignOffset(align, metrics.width)
    left = Math.max(left, metrics.actualBoundingBoxLeft + outline - x)
    right = Math.max(right, x + metrics.actualBoundingBoxRight + outline - width)
    if (i === 0) top = Math.max(top, metrics.actualBoundingBoxAscent + outline - ascent)
    if (i === lines.length - 1) bottom = Math.max(bottom, metrics.actualBoundingBoxDescent + outline - descent)
  }
  return [top, right, bottom, left].map(e => Math.ceil(e))
}

function addEdges(a, b) {
  return a.map((e, i) => e + b[i])
}

function getLines(ctx, text, maxWidth) {
  const lines = []
  let broke = false
  for (const paragraph of text.split("\n")) {
    let current = ""
    for (const [i, token] of (paragraph.match(/\s*\S+/g) ?? [""]).entries()) {
      const candidate = current + token
      if (textWidth(ctx, candidate) <= maxWidth) {
        current = candidate
        continue
      }
      const word = i === 0 ? token : token.trimStart()
      if (current) lines.push(current)
      if (textWidth(ctx, word) <= maxWidth) {
        current = word
        continue
      }
      broke = true
      const parts = breakWord(ctx, word, maxWidth)
      current = parts.pop()
      lines.push(...parts)
    }
    lines.push(current)
  }
  return { lines, width: Math.max(...lines.map(line => textWidth(ctx, line))), broke }
}

function breakWord(ctx, word, maxWidth) {
  const parts = []
  let current = ""
  for (const { segment } of segmenter.segment(word)) {
    if (!current || textWidth(ctx, current + segment + hyphen(segment)) <= maxWidth) {
      current += segment
      continue
    }
    parts.push(current + hyphen(current))
    current = segment
  }
  parts.push(current)
  return parts
}

function hyphen(text) {
  return splitText(text).at(-1)?.type === "emoji" ? "" : "-"
}

function textWidth(ctx, text) {
  return measureText(ctx, text).width
}

export default drawText