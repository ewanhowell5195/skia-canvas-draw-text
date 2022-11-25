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
    let shadowOffsetX, shadowOffsetY, shadowDistance, paddingLeft, paddingTop, shadowWidth, shadowHeight, lines, maxWidth, metrics, textHeight, textGap, maxHeight
    function calculate() {
      shadowOffsetX = args.shadowOffset ? Math.ceil(args.fontSize / 200 * args.shadowOffset[0]) : 0
      shadowOffsetY = args.shadowOffset ? Math.ceil(args.fontSize / 200 * args.shadowOffset[1]) : 0
      shadowDistance = args.shadowBlur ? Math.ceil(args.fontSize / 100 * args.shadowBlur) : 0
      paddingLeft = shadowOffsetX < 0 ? -shadowOffsetX : 0
      paddingTop = shadowOffsetY < 0 ? -shadowOffsetY : 0
      shadowWidth = Math.max(shadowDistance, shadowDistance * 2 - Math.abs(shadowOffsetX))
      shadowHeight = Math.max(shadowDistance, shadowDistance * 2 - Math.abs(shadowOffsetY));
      [lines, maxWidth] = getLines(ctx, text, widthRestriction - Math.abs(shadowOffsetX) - shadowWidth)
      metrics = ctx.measureText("e")
      textHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
      textGap = textHeight / 100 * (args.spacing ?? 0)
      maxHeight = (textHeight * lines.length + textGap * (lines.length - 1))
    }
    calculate()
    if (args.height) {
      let heightLimit = args.height - Math.abs(shadowOffsetY) - shadowHeight
      while (args.fontSize > 1 && maxHeight >= heightLimit) {
        ctx.font = `${bold}${args.fontSize--}px${fontFamily}`;
        calculate()
        heightLimit = args.height - Math.abs(shadowOffsetY) - shadowHeight
      }
    }
    const textCanvas = new Canvas(maxWidth + Math.abs(shadowOffsetX) + shadowWidth, Math.floor(maxHeight + Math.abs(shadowOffsetY) + shadowHeight))
    const textCtx = textCanvas.getContext("2d")
    textCtx.font = `${bold}${args.fontSize}px${args.fontFamily ? ` ${args.fontFamily}` : ""}`
    textCtx.fillStyle = args.colour ?? "#000"
    textCtx.textBaseline = "top"
    if (args.align) textCtx.textAlign = args.align
    textCtx.shadowColor = args.shadowColour ?? "#000"
    if (args.shadowBlur) textCtx.shadowBlur = args.fontSize / 100 * args.shadowBlur
    if (args.shadowOffset) {
      textCtx.shadowOffsetX = args.fontSize / 200 * args.shadowOffset[0]
      textCtx.shadowOffsetY = args.fontSize / 200 * args.shadowOffset[1]
    }
    const drawStartX = args.align === "center" ? (textCanvas.width - shadowOffsetX) / 2 + Math.max(-7.5, shadowDistance / 2 - Math.abs(shadowOffsetX)) * Math.sign(shadowOffsetX) : args.align === "right" ? textCanvas.width - Math.max(0, shadowDistance + shadowOffsetX) : paddingLeft + Math.max(0, shadowDistance - Math.max(0, shadowOffsetX))
    const drawStartY = Math.max(0, shadowDistance - Math.max(0, shadowOffsetY))
    for (let i = 0; i < lines.length; i ++) {
      await fillTextWithTwemoji(textCtx, lines[i], drawStartX, textHeight *  i + textGap * i + paddingTop + drawStartY)
    }
    if (!args.ctx) {
      textCanvas.textWidth = maxWidth
      textCanvas.textHeight = maxHeight
      textCanvas.shadowOffsetX = (-shadowOffsetX - shadowDistance * Math.sign(shadowOffsetX) + textCanvas.width - maxWidth) / 2
      textCanvas.shadowOffsetY = (-shadowOffsetY - shadowDistance * Math.sign(shadowOffsetY) + textCanvas.height - maxHeight) / 2
      return textCanvas
    }
    args.gravity ??= "nw"
    let horizontalOffset, verticalOffset
    switch (args.gravity) {
      case "nw":
      case "w":
      case "sw":
        horizontalOffset = (-shadowOffsetX - shadowDistance * Math.sign(shadowOffsetX) + textCanvas.width - maxWidth) / 2
        break
      case "n":
      case "c":
      case "s":
        horizontalOffset = textCanvas.width / 2 + (-shadowOffsetX - shadowDistance * Math.sign(shadowOffsetX)) / 2
        break
      case "ne":
      case "e":
      case "se":
        horizontalOffset = maxWidth + (-shadowOffsetX - shadowDistance * Math.sign(shadowOffsetX) + textCanvas.width - maxWidth) / 2
        break
    }
    switch (args.gravity) {
      case "nw":
      case "n":
      case "ne":
        verticalOffset = (-shadowOffsetY - shadowDistance * Math.sign(shadowOffsetY) + textCanvas.height - maxHeight) / 2
        break
      case "w":
      case "c":
      case "e":
        verticalOffset = textCanvas.height / 2 + (-shadowOffsetY - shadowDistance * Math.sign(shadowOffsetY)) / 2
        break
      case "sw":
      case "s":
      case "se":
        verticalOffset = maxHeight + (-shadowOffsetY - shadowDistance * Math.sign(shadowOffsetY) + textCanvas.height - maxHeight) / 2
        break
    }
    args.location ??= [0, 0]
    ctx.drawImage(textCanvas, args.location[0] - horizontalOffset, args.location[1] - verticalOffset)
  } else {
    args.location ??= [0, 0]
    ctx.fillStyle = args.colour ?? "#000"
    if (args.align) ctx.textAlign = args.align
    if (args.baseline) ctx.textBaseline = args.baseline
    if (args.width) {
      while (args.fontSize > 1 && ctx.measureText(text).width > args.width) {
        ctx.font = `${bold}${--args.fontSize}px${args.fontFamily ? ` ${args.fontFamily}` : ""}`
      }
    }
    ctx.shadowColor = args.shadowColour ?? "#000"
    if (args.shadowBlur) ctx.shadowBlur = args.fontSize / 100 * args.shadowBlur
    if (args.shadowOffset) {
      ctx.shadowOffsetX = args.fontSize / 200 * args.shadowOffset[0]
      ctx.shadowOffsetY = args.fontSize / 200 * args.shadowOffset[1]
    }
    if (!args.ctx) {
      const metrics = ctx.measureText(text)
      const oldCtx = Object.assign(ctx, {})
      const shadowBlurOffset = ctx.shadowBlur / 2
      const canvas = new Canvas(Math.ceil(metrics.width + Math.abs(ctx.shadowOffsetX) + shadowBlurOffset), Math.ceil(metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent + Math.abs(ctx.shadowOffsetY) + shadowBlurOffset))
      const ctx2 = canvas.getContext("2d")
      ctx2.textBaseline = "top"
      ctx2.fillStyle = ctx.fillStyle
      ctx2.font = ctx.font
      ctx2.shadowColor = ctx.shadowColor
      ctx2.shadowBlur = ctx.shadowBlur
      ctx2.shadowOffsetX = ctx.shadowOffsetX
      ctx2.shadowOffsetY = ctx.shadowOffsetY
      await fillTextWithTwemoji(ctx2, text, ctx.shadowOffsetX < 0 ? -ctx.shadowOffsetX + shadowBlurOffset : 0, ctx.shadowOffsetY < 0 ? -ctx.shadowOffsetY + shadowBlurOffset : 0)
      return canvas
    }
    await fillTextWithTwemoji(ctx, text, args.location[0], args.location[1])
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