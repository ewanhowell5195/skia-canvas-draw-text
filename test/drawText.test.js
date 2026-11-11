import test from "node:test"
import assert from "node:assert/strict"
import { Canvas } from "skia-canvas"
import { fillText, measureText, strokeText } from "skia-canvas-with-twemoji"
import drawText from "../index.js"

function inkBounds(canvas) {
  const { data, width, height } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
    }
  }
  return { x0, y0, x1, y1 }
}

function inkCount(canvas) {
  const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
  let count = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] > 16) count++
  return count
}

function measure(text, font) {
  const ctx = new Canvas(1, 1).getContext("2d")
  ctx.font = font
  return measureText(ctx, text)
}

function lineHeight(fontSize) {
  return drawText("x", { fontSize }).textHeight
}

function targetCanvas() {
  const canvas = new Canvas(400, 300)
  const ctx = canvas.getContext("2d")
  ctx.font = "13px serif"
  ctx.fillStyle = "#123456"
  ctx.strokeStyle = "#654321"
  ctx.lineWidth = 3
  ctx.lineJoin = "bevel"
  ctx.textAlign = "right"
  ctx.textBaseline = "bottom"
  return { canvas, ctx }
}

function ctxState(ctx) {
  return { font: ctx.font, fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth, lineJoin: ctx.lineJoin, textAlign: ctx.textAlign, textBaseline: ctx.textBaseline, shadowColor: ctx.shadowColor, shadowBlur: ctx.shadowBlur, shadowOffsetX: ctx.shadowOffsetX, shadowOffsetY: ctx.shadowOffsetY }
}

function assertInk(canvas, reference, label) {
  const drawn = inkCount(canvas)
  const expected = inkCount(reference)
  assert.ok(Math.abs(drawn - expected) <= expected * 0.005, `${label}: ${drawn} ink pixels, expected ${expected}`)
}

test("returns a canvas synchronously when no ctx is given", () => {
  const canvas = drawText("Hello", { fontSize: 40 })
  assert.ok(canvas instanceof Canvas)
  assert.equal(typeof canvas.then, "undefined")
  assert.equal(canvas.textWidth, Math.ceil(measure("Hello", "40px sans-serif").width))
  assert.equal(canvas.fontSize, 40)
  assert.deepEqual(canvas.padding, [0, 0, 0, 0])
})

test("fontSize defaults to 10", () => {
  assert.equal(drawText("Hello").textWidth, drawText("Hello", { fontSize: 10 }).textWidth)
})

test("the options object is never changed", () => {
  for (const args of [{ fontSize: 60, maxWidth: 100 }, { fontSize: 80, wrap: true, maxWidth: 300, maxHeight: 120, shadowBlur: 4 }, { ctx: targetCanvas().ctx, fontSize: 60, maxWidth: 100, location: [10, 50] }]) {
    const before = Object.assign({}, args)
    drawText("options stay as they were", args)
    assert.deepEqual(Object.keys(args), Object.keys(before))
    for (const key of Object.keys(args)) assert.equal(args[key], before[key], key)
  }
})

test("fontFamily, fontWeight and fontStyle apply without a fontSize", () => {
  assert.equal(drawText("Hello there", { fontFamily: "serif", fontWeight: "bold" }).textWidth, Math.ceil(measure("Hello there", "bold 10px serif").width))
  assert.equal(drawText("Hello there", { fontSize: 40, fontFamily: "serif", fontWeight: 600, fontStyle: "italic" }).textWidth, Math.ceil(measure("Hello there", "italic 600 40px serif").width))
})

test("quoted font families resolve the same as unquoted ones", () => {
  const plain = drawText("Font check", { fontSize: 40, fontFamily: "Times New Roman" })
  assert.equal(drawText("Font check", { fontSize: 40, fontFamily: "'Times New Roman'" }).textWidth, plain.textWidth)
  assert.equal(drawText("Font check", { fontSize: 40, fontFamily: "\"Times New Roman\"" }).textWidth, plain.textWidth)
})

test("padding grows the canvas but not textWidth or textHeight", () => {
  const plain = drawText("Pad 🍕", { fontSize: 40 })
  const padded = drawText("Pad 🍕", { fontSize: 40, padding: [10, 20, 30, 40] })
  assert.equal(padded.textWidth, plain.textWidth)
  assert.equal(padded.textHeight, plain.textHeight)
  assert.equal(padded.width, plain.width + 60)
  assert.equal(padded.height, plain.height + 40)
  assert.deepEqual(padded.padding, [10, 20, 30, 40].map((e, i) => e + plain.padding[i]))
})

test("shadow offsets are in pixels, with space on the side the shadow falls", () => {
  const plain = drawText("Shadow", { fontSize: 40 })
  const right = drawText("Shadow", { fontSize: 40, shadowOffset: [20, 10] })
  assert.equal(right.width, plain.width + 20)
  assert.equal(right.height, plain.height + 10)
  assert.equal(right.padding[0], 0)
  assert.equal(right.padding[3], 0)
  const left = drawText("Shadow", { fontSize: 40, shadowOffset: [-20, -10] })
  assert.equal(left.width, plain.width + 20)
  assert.equal(left.padding[1], 0)
  assert.equal(left.padding[2], 0)
  assert.equal(drawText("Shadow", { fontSize: 80, shadowOffset: [20, 10] }).width - drawText("Shadow", { fontSize: 80 }).width, 20)
})

test("blurred shadows are not clipped", () => {
  const canvas = drawText("Blur", { fontSize: 40, shadowBlur: 10, shadowOffset: [5, 5] })
  const reference = new Canvas(canvas.width + 200, canvas.height + 200)
  const ctx = reference.getContext("2d")
  ctx.font = "40px sans-serif"
  ctx.shadowColor = "#000"
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 5
  ctx.shadowOffsetY = 5
  fillText(ctx, "Blur", 100, 100 + measure("Blur", "40px sans-serif").fontBoundingBoxAscent)
  assertInk(canvas, reference, "Blur")
})

test("emoji are measured as drawn and never clipped", () => {
  for (const text of ["👍", "reacted by 👍", "👍👍👍", "🇬🇧🇬🇧 and 👨‍👩‍👧‍👦"]) {
    const canvas = drawText(text, { fontSize: 64 })
    assert.equal(canvas.textWidth, Math.ceil(measure(text, "64px sans-serif").width), text)
    const reference = new Canvas(canvas.width + 200, canvas.height + 200)
    const ctx = reference.getContext("2d")
    ctx.font = "64px sans-serif"
    fillText(ctx, text, 100, 100 + measure(text, "64px sans-serif").fontBoundingBoxAscent)
    assertInk(canvas, reference, text)
  }
})

test("glyphs that overhang their advance are not clipped", () => {
  for (const [text, args] of [["jeff", { fontSize: 64 }], ["jeff", { fontSize: 64, fontFamily: "serif", fontStyle: "italic" }], ["just a jiffy\nof", { fontSize: 64, wrap: true }], ["jeff", { fontSize: 64, fontFamily: "serif", fontStyle: "italic", wrap: true, align: "right" }]]) {
    const canvas = drawText(text, args)
    const font = `${args.fontStyle ? `${args.fontStyle} ` : ""}64px ${args.fontFamily ?? "sans-serif"}`
    const reference = new Canvas(canvas.width + 400, canvas.height + 400)
    const ctx = reference.getContext("2d")
    ctx.font = font
    const metrics = measure(text, font)
    for (const [i, line] of text.split("\n").entries()) fillText(ctx, line, 200, 200 + metrics.fontBoundingBoxAscent + (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) * i)
    assertInk(canvas, reference, `${JSON.stringify(text)} ${font}`)
    assert.equal(canvas.textWidth, Math.max(...text.split("\n").map(line => Math.ceil(measure(line, font).width))))
  }
})

test("padding reports where the text box sits when glyphs overhang", () => {
  const canvas = drawText("jeff", { fontSize: 64, fontFamily: "serif", fontStyle: "italic" })
  assert.ok(canvas.padding[3] > 0 && canvas.padding[1] > 0)
  assert.equal(canvas.width, canvas.textWidth + canvas.padding[1] + canvas.padding[3])
})

test("outlines are drawn outside the text and not clipped", () => {
  for (const args of [{ fontSize: 64, outlineWidth: 4, outlineColour: "#f00", colour: "#fff" }, { fontSize: 64, outlineWidth: 6, wrap: true, align: "center" }]) {
    const plain = drawText("Outline 🍕", { fontSize: 64 })
    const canvas = drawText("Outline 🍕", args)
    assert.equal(canvas.textWidth, plain.textWidth)
    assert.ok(canvas.width > plain.width)
    assert.ok(canvas.height > plain.height)
    const reference = new Canvas(canvas.width + 200, canvas.height + 200)
    const ctx = reference.getContext("2d")
    ctx.font = "64px sans-serif"
    ctx.lineWidth = args.outlineWidth * 2
    ctx.lineJoin = "round"
    const y = 100 + measure("Outline 🍕", "64px sans-serif").fontBoundingBoxAscent
    strokeText(ctx, "Outline 🍕", 100, y)
    fillText(ctx, "Outline 🍕", 100, y)
    assertInk(canvas, reference, JSON.stringify(args))
  }
})

test("maxWidth shrinks the font to the largest size that fits", () => {
  const args = { fontSize: 60, maxWidth: 300 }
  const canvas = drawText("shrink to fit 🎉🎉🎉 please", args)
  assert.ok(canvas.fontSize < 60)
  assert.ok(canvas.textWidth <= 300)
  assert.equal(canvas.textWidth, Math.ceil(measure("shrink to fit 🎉🎉🎉 please", `${canvas.fontSize}px sans-serif`).width))
  assert.ok(measure("shrink to fit 🎉🎉🎉 please", `${canvas.fontSize + 1}px sans-serif`).width > 300)
})

test("maxWidth and maxHeight include the shadow and outline", () => {
  const canvas = drawText("fits with its shadow", { fontSize: 60, maxWidth: 300, shadowOffset: [20, 0], outlineWidth: 5 })
  assert.ok(canvas.textWidth + 20 + 10 <= 300)
})

test("maxHeight shrinks single-line text", () => {
  const canvas = drawText("short", { fontSize: 100, maxHeight: 40 })
  assert.ok(canvas.textHeight <= 40)
  assert.ok(lineHeight(canvas.fontSize + 1) > 40)
})

test("minFontSize stops the shrinking", () => {
  const canvas = drawText("this will never fit in the space given", { fontSize: 40, maxWidth: 50, minFontSize: 20 })
  assert.equal(canvas.fontSize, 20)
})

test("a ctx result includes the fontSize drawn", () => {
  const { ctx } = targetCanvas()
  assert.ok(drawText("shrink this on the ctx", { ctx, fontSize: 60, maxWidth: 100, location: [10, 50] }).fontSize < 60)
})

test("wrapping breaks at maxWidth and on newlines", () => {
  const font = measure("x", "40px sans-serif")
  const one = font.fontBoundingBoxAscent + font.fontBoundingBoxDescent
  assert.equal(drawText("a\nb\nc", { fontSize: 40, wrap: true, maxWidth: 500 }).textHeight, Math.ceil(one * 3))
  assert.equal(drawText("a\r\nb\rc", { fontSize: 40, wrap: true, maxWidth: 500 }).textHeight, Math.ceil(one * 3))
  const wrapped = drawText("the quick brown fox jumps over the lazy dog", { fontSize: 40, wrap: true, maxWidth: 200 })
  assert.equal(wrapped.fontSize, 40)
  assert.ok(wrapped.textWidth <= 200)
  assert.ok(wrapped.textHeight > one * 2)
})

test("wrapping without a maxWidth or ctx only breaks on newlines", () => {
  assert.equal(drawText("one line of text", { fontSize: 40, wrap: true }).textHeight, lineHeight(40))
})

test("maxHeight shrinks wrapped text until it fits", () => {
  const canvas = drawText("wrapped text that has to shrink to fit the height", { fontSize: 80, wrap: true, maxWidth: 300, maxHeight: 120 })
  assert.ok(canvas.fontSize < 80)
  assert.ok(canvas.textHeight <= 120)
  assert.ok(drawText("wrapped text that has to shrink to fit the height", { fontSize: canvas.fontSize + 1, wrap: true, maxWidth: 300 }).textHeight > 120)
})

test("whitespace is kept inside lines and dropped at the end of them", () => {
  const single = drawText("a b", { fontSize: 40 }).textWidth
  assert.ok(drawText("a   b", { fontSize: 40 }).textWidth > single)
  assert.ok(drawText("a   b", { fontSize: 40, wrap: true }).textWidth > single)
  assert.ok(drawText("  a b", { fontSize: 40, wrap: true }).textWidth > single)
  assert.equal(drawText("a b   ", { fontSize: 40 }).textWidth, single)
  assert.equal(drawText("a b   \nc", { fontSize: 40, wrap: true }).textWidth, single)
  const tabbed = drawText("tabs\tbreak\tlines\ttoo", { fontSize: 40, wrap: true, maxWidth: 150, minFontSize: 40 })
  assert.ok(tabbed.textWidth <= 150)
  assert.ok(tabbed.textHeight > lineHeight(40) * 2)
})

test("long words shrink to fit maxWidth, and break once minFontSize is reached", () => {
  const word = "supercalifragilisticexpialidocious"
  const shrunk = drawText(word, { fontSize: 40, wrap: true, maxWidth: 200 })
  assert.ok(shrunk.fontSize < 40)
  assert.equal(shrunk.textHeight, lineHeight(shrunk.fontSize))
  const broken = drawText(word, { fontSize: 40, wrap: true, maxWidth: 200, minFontSize: 40 })
  assert.ok(broken.textWidth <= 200)
  assert.ok(broken.textHeight > lineHeight(40))
  const emoji = drawText("😀😀😀😀😀😀😀😀😀😀😀😀", { fontSize: 40, wrap: true, maxWidth: 200, minFontSize: 40 })
  const perLine = Math.floor(200 / measure("😀", "40px sans-serif").width)
  assert.equal(emoji.textWidth, Math.ceil(measure("😀".repeat(perLine), "40px sans-serif").width))
})

test("wrapping at the ctx width breaks long words without shrinking", () => {
  const canvas = new Canvas(200, 300)
  const result = drawText("supercalifragilisticexpialidocious", { ctx: canvas.getContext("2d"), fontSize: 40, wrap: true })
  assert.equal(result.fontSize, 40)
  assert.ok(result.textHeight > lineHeight(40))
})

test("the caller's ctx keeps its own state", () => {
  for (const args of [{ fontSize: 30, location: [20, 60], shadowBlur: 10, shadowOffset: [10, 10], outlineWidth: 3, align: "center", baseline: "middle", colour: "red" }, { fontSize: 30, location: [20, 60], wrap: true, maxWidth: 200, shadowBlur: 10, shadowOffset: [10, 10], outlineWidth: 3, colour: "red" }]) {
    const { ctx } = targetCanvas()
    const before = ctxState(ctx)
    drawText("state check 🍔", { ctx, ...args })
    assert.deepEqual(ctxState(ctx), before)
  }
})

test("drawing on a ctx returns the text size and draws at the location", () => {
  const { canvas, ctx } = targetCanvas()
  const result = drawText("Left 🍔", { ctx, fontSize: 30, location: [50, 100], baseline: "top" })
  assert.equal(result.textWidth, Math.ceil(measure("Left 🍔", "30px sans-serif").width))
  const ink = inkBounds(canvas)
  assert.ok(Math.abs(ink.x0 - 50) <= 4, `ink starts at ${ink.x0}`)
  assert.ok(ink.y0 >= 98 && ink.y0 <= 110, `ink top at ${ink.y0}`)
})

test("drawing on a ctx returns the same canvas as drawing without one", () => {
  for (const args of [{ fontSize: 30, padding: [1, 2, 3, 4], shadowBlur: 4 }, { fontSize: 30, wrap: true, maxWidth: 150, outlineWidth: 2 }]) {
    const plain = drawText("same canvas 🍔 either way", args)
    const drawn = drawText("same canvas 🍔 either way", Object.assign({ ctx: targetCanvas().ctx, location: [50, 100] }, args))
    assert.ok(drawn instanceof Canvas)
    for (const key of ["width", "height", "textWidth", "textHeight", "fontSize"]) assert.equal(drawn[key], plain[key], key)
    assert.deepEqual(drawn.padding, plain.padding)
  }
})

test("single-line text on a ctx lands where fillText puts it", () => {
  for (const align of ["left", "center", "right"]) {
    for (const baseline of ["alphabetic", "top", "middle", "bottom", "hanging"]) {
      const { canvas, ctx } = targetCanvas()
      drawText("Placed Text", { ctx, fontSize: 30, location: [200, 150], align, baseline })
      const reference = new Canvas(400, 300)
      const referenceCtx = reference.getContext("2d")
      referenceCtx.font = "30px sans-serif"
      referenceCtx.textAlign = align
      referenceCtx.textBaseline = baseline
      referenceCtx.fillText("Placed Text", 200, 150)
      const ink = inkBounds(canvas)
      const expected = inkBounds(reference)
      for (const key of ["x0", "y0", "x1", "y1"]) assert.ok(Math.abs(ink[key] - expected[key]) <= 1, `${align} ${baseline} ${key}: ${ink[key]}, expected ${expected[key]}`)
    }
  }
})

test("padding does not move text drawn on a ctx", () => {
  for (const args of [{ fontSize: 30, location: [200, 150], align: "center", baseline: "middle" }, { fontSize: 30, location: [200, 150], wrap: true, maxWidth: 150, align: "right", baseline: "bottom" }]) {
    const plain = targetCanvas()
    drawText("padding check", Object.assign({ ctx: plain.ctx }, args))
    const padded = targetCanvas()
    drawText("padding check", Object.assign({ ctx: padded.ctx, padding: [10, 20, 30, 40] }, args))
    assert.deepEqual(inkBounds(padded.canvas), inkBounds(plain.canvas))
  }
})

test("align centres single-line text on the location", () => {
  const { canvas, ctx } = targetCanvas()
  drawText("Centred 🍔", { ctx, fontSize: 30, location: [200, 100], align: "center" })
  const ink = inkBounds(canvas)
  assert.ok(Math.abs((ink.x0 + ink.x1) / 2 - 200) <= 3, `ink centre at ${(ink.x0 + ink.x1) / 2}`)
})

test("multi-line text on a ctx anchors its first line, last line or middle like fillText", () => {
  const metrics = measure("", "30px sans-serif")
  const pitch = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
  for (const align of ["left", "center", "right"]) {
    for (const baseline of ["top", "alphabetic", "bottom"]) {
      const { canvas, ctx } = targetCanvas()
      drawText("first line\nsecond", { ctx, fontSize: 30, location: [200, 150], align, baseline })
      const reference = new Canvas(400, 300)
      const referenceCtx = reference.getContext("2d")
      referenceCtx.font = "30px sans-serif"
      referenceCtx.textAlign = align
      referenceCtx.textBaseline = baseline
      const firstY = baseline === "bottom" ? 150 - pitch : 150
      referenceCtx.fillText("first line", 200, firstY)
      referenceCtx.fillText("second", 200, firstY + pitch)
      const ink = inkBounds(canvas)
      const expected = inkBounds(reference)
      for (const key of ["x0", "y0", "x1", "y1"]) assert.ok(Math.abs(ink[key] - expected[key]) <= 1, `${align} ${baseline} ${key}: ${ink[key]}, expected ${expected[key]}`)
    }
  }
  const top = targetCanvas()
  drawText("first line\nsecond", { ctx: top.ctx, fontSize: 30, location: [200, 150], baseline: "top" })
  const middle = targetCanvas()
  drawText("first line\nsecond", { ctx: middle.ctx, fontSize: 30, location: [200, 150], baseline: "middle" })
  const shift = (pitch + 30) / 2
  assert.ok(Math.abs(inkBounds(top.canvas).y0 - shift - inkBounds(middle.canvas).y0) <= 1)
})

test("newlines start a new line without wrap", () => {
  const canvas = drawText("a\nb\nc", { fontSize: 40 })
  assert.equal(canvas.textHeight, Math.ceil(measure("", "40px sans-serif").fontBoundingBoxAscent * 3 + measure("", "40px sans-serif").fontBoundingBoxDescent * 3))
  assert.equal(canvas.textWidth, Math.ceil(Math.max(...["a", "b", "c"].map(line => measure(line, "40px sans-serif").width))))
})

test("maxWidth without wrap shrinks to fit the widest line", () => {
  const canvas = drawText("short\na much longer line here", { fontSize: 60, maxWidth: 300 })
  assert.ok(canvas.textWidth <= 300)
  assert.ok(measure("a much longer line here", `${canvas.fontSize + 1}px sans-serif`).width > 300)
})

test("lineHeight multiplies the space between lines", () => {
  const metrics = measure("", "40px sans-serif")
  const line = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
  assert.equal(drawText("a\nb\nc", { fontSize: 40, lineHeight: 1.5 }).textHeight, Math.ceil(line + line * 1.5 * 2))
  assert.equal(drawText("a", { fontSize: 40, lineHeight: 1.5 }).textHeight, Math.ceil(line))
})

test("line height comes from the font, not the text", () => {
  assert.equal(drawText("plain", { fontSize: 40 }).textHeight, drawText("with 😀 emoji", { fontSize: 40 }).textHeight)
  assert.equal(drawText("x", { fontSize: 40 }).textHeight, drawText("Ég", { fontSize: 40 }).textHeight)
})

test("empty text gives a canvas that can still be exported", () => {
  for (const text of ["", "   ", "\n"]) {
    const canvas = drawText(text, { fontSize: 40 })
    assert.ok(canvas.width >= 1 && canvas.height >= 1)
    assert.equal(canvas.textWidth, 0)
    assert.ok(canvas.toBufferSync("png").length > 0)
  }
})

test("an invalid align or baseline throws", () => {
  assert.throws(() => drawText("x", { align: "middle" }), /Invalid align "middle"/)
  assert.throws(() => drawText("x", { baseline: "centre" }), /Invalid baseline "centre"/)
})