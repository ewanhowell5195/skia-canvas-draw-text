import type { Canvas, CanvasRenderingContext2D } from "skia-canvas"

export type Align = "left" | "center" | "right"
export type Baseline = "top" | "middle" | "bottom" | "alphabetic" | "hanging" | "ideographic"
export type Sides = [top: number, right: number, bottom: number, left: number]
export type Style = CanvasRenderingContext2D["fillStyle"]

export interface DrawTextOptions {
  ctx?: CanvasRenderingContext2D
  location?: [x: number, y: number]
  colour?: Style
  fontSize?: number
  minFontSize?: number
  fontFamily?: string
  fontWeight?: string | number
  fontStyle?: string
  maxWidth?: number
  maxHeight?: number
  wrap?: boolean
  align?: Align
  baseline?: Baseline
  lineHeight?: number
  outlineColour?: Style
  outlineWidth?: number
  shadowColour?: string
  shadowBlur?: number
  shadowOffset?: [x: number, y: number]
  padding?: Sides
}

export interface TextCanvas extends Canvas {
  textWidth: number
  textHeight: number
  fontSize: number
  padding: Sides
}

export function drawText(text: string, options?: DrawTextOptions): TextCanvas

export default drawText