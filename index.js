import { fillTextWithTwemoji } from "skia-canvas-twemoji"
import { Canvas } from "skia-canvas"

export const drawText = async (text, args) => {
  args ??= {}
  let ctx, fontFamily, bold
  if (args.ctx) ctx = args.ctx
  else {
    const canvas = new Canvas(1, 1)
    ctx = canvas.getContext("2d")
  }
  if (args.fontSize) {
    fontFamily = args.fontFamily ? ` "${args.fontFamily}"` : ""
    bold = args.bold ? (args.bold === true ? "bold " : `${args.bold} `) : ""
    ctx.font = `${bold}${args.fontSize}px${fontFamily}`
  } else {
    fontFamily = ""
    args.fontSize = 10
  }
  if (args.wrap) {
    const widthRestriction = args.width ?? ctx.canvas.width
    let lines, maxWidth, metrics, textHeight, textGap, maxHeight, shadowOffsetX, shadowOffsetY, shadowOffsets, shadowDistance
    function calculate() {
      shadowOffsets = [0, 0, 0, 0]
      shadowOffsetX = args.shadowOffset ? Math.ceil(args.fontSize / 200 * args.shadowOffset[0]) : 0
      shadowOffsetY = args.shadowOffset ? Math.ceil(args.fontSize / 200 * args.shadowOffset[1]) : 0
      if (shadowOffsetX > 0) {
        shadowOffsets[1] = shadowOffsetX
        shadowOffsets[3] = -shadowOffsetX
      } else {
        shadowOffsets[1] = -Math.abs(shadowOffsetX)
        shadowOffsets[3] = -shadowOffsets[1]
      }
      if (shadowOffsetY > 0) {
        shadowOffsets[0] = -shadowOffsetY
        shadowOffsets[2] = shadowOffsetY
      } else {
        shadowOffsets[0] = Math.abs(shadowOffsetY)
        shadowOffsets[2] = -shadowOffsets[0]
      }
      shadowDistance = args.shadowBlur ? Math.ceil(args.fontSize / 100 * args.shadowBlur) * 4 / 3 : 0
      shadowOffsets = shadowOffsets.map(e => Math.max(Math.ceil(e + shadowDistance), 0));
      [lines, maxWidth] = getLines(ctx, text, widthRestriction - shadowOffsets[1] - shadowOffsets[3])
      metrics = ctx.measureText("e")
      textHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
      textGap = textHeight / 100 * (args.spacing ?? 0)
      maxHeight = (textHeight * lines.length + textGap * (lines.length - 1))
    }
    calculate()
    if (args.height) {
      let heightLimit = args.height - shadowOffsets[0] - shadowOffsets[2]
      while (args.fontSize > 1 && maxHeight >= heightLimit) {
        ctx.font = `${bold}${args.fontSize--}px${fontFamily}`
        calculate()
        heightLimit = args.height - shadowOffsets[0] - shadowOffsets[2]
      }
    }
    maxHeight = Math.floor(maxHeight)
    const textCanvas = new Canvas(Math.ceil(maxWidth + shadowOffsets[1] + shadowOffsets[3]), Math.ceil(maxHeight + shadowOffsets[0] + shadowOffsets[2]))
    const textCtx = textCanvas.getContext("2d")
    textCtx.font = `${bold}${args.fontSize}px${args.fontFamily ? ` ${args.fontFamily}` : ""}`
    textCtx.textBaseline = "top"
    if (args.align) textCtx.textAlign = args.align
    const drawStartX = (args.align === "center" ? maxWidth / 2 : args.align === "left" ? 0 : maxWidth) + shadowOffsets[3]
    textCtx.fillStyle = args.colour ?? "#000"
    for (let i = 0; i < lines.length; i ++) {
      await fillTextWithTwemoji(textCtx, lines[i], drawStartX, shadowOffsets[0] + textHeight *  i + textGap * i)
    }
    let final, finalCtx
    if (args.shadowOffset || args.shadowBlur) {
      final = new Canvas(textCanvas.width, textCanvas.height)
      finalCtx = final.getContext("2d")
      finalCtx.shadowColor = args.shadowColour ?? "#000"
      finalCtx.shadowBlur = args.shadowBlur ? args.fontSize / 100 * args.shadowBlur : 0
      finalCtx.shadowOffsetX = shadowOffsetX
      finalCtx.shadowOffsetY = shadowOffsetY
      finalCtx.drawImage(textCanvas, 0, 0)
    } else {
      final = textCanvas
      finalCtx = textCtx
    }
    if (!args.ctx) {
      final.textWidth = Math.ceil(maxWidth)
      final.textHeight = Math.ceil(maxHeight)
      final.padding = shadowOffsets
      return final
    }
    args.gravity ??= "nw"
    let horizontalOffset, verticalOffset
    switch (args.gravity) {
      case "nw":
      case "w":
      case "sw":
        horizontalOffset = shadowOffsets[3]
        break
      case "n":
      case "c":
      case "s":
        horizontalOffset = final.width / 2 - shadowOffsets[1] / 2 + shadowOffsets[3] / 2
        break
      case "ne":
      case "e":
      case "se":
        horizontalOffset = final.width - shadowOffsets[1]
        break
    }
    switch (args.gravity) {
      case "nw":
      case "n":
      case "ne":
        verticalOffset = shadowOffsets[0]
        break
      case "w":
      case "c":
      case "e":
        verticalOffset = final.height / 2 - shadowOffsets[2] / 2 + shadowOffsets[0] / 2
        break
      case "sw":
      case "s":
      case "se":
        verticalOffset = final.height - shadowOffsets[2]
        break
    }
    args.location ??= [0, 0]
    ctx.drawImage(final, args.location[0] - horizontalOffset, args.location[1] - verticalOffset)
    return {
      textWidth: final.width - shadowOffsets[1] - shadowOffsets[3],
      textHeight: final.height - shadowOffsets[0] - shadowOffsets[2]
    }
  } else {
    args.location ??= [0, 0]
    let shadowOffsetX, shadowOffsetY, shadowOffsets, shadowDistance
    function calculate() {
      shadowOffsets = [0, 0, 0, 0]
      shadowOffsetX = args.shadowOffset ? Math.ceil(args.fontSize / 200 * args.shadowOffset[0]) : 0
      shadowOffsetY = args.shadowOffset ? Math.ceil(args.fontSize / 200 * args.shadowOffset[1]) : 0
      if (shadowOffsetX > 0) {
        shadowOffsets[1] = shadowOffsetX
        shadowOffsets[3] = -shadowOffsetX
      } else {
        shadowOffsets[1] = -Math.abs(shadowOffsetX)
        shadowOffsets[3] = -shadowOffsets[1]
      }
      if (shadowOffsetY > 0) {
        shadowOffsets[0] = -shadowOffsetY
        shadowOffsets[2] = shadowOffsetY
      } else {
        shadowOffsets[0] = Math.abs(shadowOffsetY)
        shadowOffsets[2] = -shadowOffsets[0]
      }
      shadowDistance = args.shadowBlur ? Math.ceil(args.fontSize / 100 * args.shadowBlur) * 4 / 3 : 0
      shadowOffsets = shadowOffsets.map(e => Math.max(Math.ceil(e + shadowDistance), 0))
    }
    calculate()
    if (args.width) {
      while (args.fontSize > 1 && ctx.measureText(text).width > (args.width - shadowOffsets[1] - shadowOffsets[3])) {
        ctx.font = `${bold}${args.fontSize--}px${fontFamily}`
        calculate()
      }
    }
    if (!args.ctx) {
      const metrics = ctx.measureText(text)
      const textCanvas = new Canvas(Math.ceil(metrics.width) + shadowOffsets[1] + shadowOffsets[3], Math.ceil(metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) + shadowOffsets[0] + shadowOffsets[2])
      const textCtx = textCanvas.getContext("2d")
      textCtx.fillStyle = args.colour ?? "#000"
      textCtx.textBaseline = "top"
      textCtx.font = ctx.font
      await fillTextWithTwemoji(textCtx, text, shadowOffsets[3], shadowOffsets[0])
      const final = new Canvas(textCanvas.width, textCanvas.height)
      const finalCtx = final.getContext("2d")
      finalCtx.shadowColor = args.shadowColour ?? "#000"
      finalCtx.shadowBlur = args.shadowBlur ? args.fontSize / 100 * args.shadowBlur : 0
      finalCtx.shadowOffsetX = shadowOffsetX ?? 0
      finalCtx.shadowOffsetY = shadowOffsetY ?? 0
      finalCtx.drawImage(textCanvas, 0, 0)
      final.textWidth = textCanvas.width - shadowOffsets[1] - shadowOffsets[3]
      final.textHeight = textCanvas.height - shadowOffsets[0] - shadowOffsets[2]
      final.padding = shadowOffsets
      return final
    }
    const textCanvas = new Canvas(ctx.canvas.width, ctx.canvas.height)
    const textCtx = textCanvas.getContext("2d")
    textCtx.fillStyle = args.colour ?? "#000"
    if (args.align) textCtx.textAlign = args.align
    if (args.baseline) textCtx.textBaseline = args.baseline
    textCtx.font = ctx.font
    await fillTextWithTwemoji(textCtx, text, args.location[0], args.location[1])
    ctx.shadowColor = args.shadowColour ?? "#000"
    ctx.shadowBlur = args.shadowBlur ? args.fontSize / 100 * args.shadowBlur : 0
    ctx.shadowOffsetX = shadowOffsetX ?? 0
    ctx.shadowOffsetY = shadowOffsetY ?? 0
    ctx.drawImage(textCanvas, 0, 0)
    const metrics = ctx.measureText(text)
    return {
      textWidth: Math.ceil(metrics.width),
      textHeight: Math.ceil(metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent)
    }
  }
}

function getLines(ctx, text, maxWidth) {
  const parts = text.split(" ")
  const lines = []
  let currentLine = ""
  let finalWidth = 0
  function charLines() {
    const chars = currentLine.split("")
    let currentPart = ""
    for (const char of chars) {
      const charWidth = ctx.measureText(currentPart + char + "-").width
      if (charWidth <= maxWidth) {
        currentPart += char
      } else {
        finalWidth = Math.max(finalWidth, ctx.measureText(currentPart + "-").width)
        lines.push(currentPart + "-")
        currentPart = char
      }
    }
    currentLine = currentPart
  }
  for (const part of parts) {
    for (const [i, word] of part.split("\n").entries()) {
      if (i > 0) {
        finalWidth = Math.max(finalWidth, ctx.measureText(currentLine).width)
        lines.push(currentLine)
        currentLine = word
        if (ctx.measureText(currentLine).width > maxWidth) {
          charLines()
        }
        continue
      }
      const spacer = currentLine === "" ? "" : " "
      const width = ctx.measureText(currentLine + spacer + word).width
      if (width <= maxWidth) {
        currentLine += spacer + word
      } else {
        if (ctx.measureText(word).width > maxWidth) {
          lines.push(currentLine)
          currentLine = word
          charLines()
        } else {
          finalWidth = Math.max(finalWidth, ctx.measureText(currentLine).width)
          lines.push(currentLine)
          currentLine = word
        }
      }
    }
  }
  finalWidth = Math.max(finalWidth, ctx.measureText(currentLine).width)
  lines.push(currentLine)
  return [lines, finalWidth]
}

export default drawText