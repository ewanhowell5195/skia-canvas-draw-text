# skia-canvas-draw-text

A function to make drawing text easier with skia-canvas: wrapping, shrink to fit, outlines, shadows, and Twemoji emoji.

[![npm version](https://badge.fury.io/js/skia-canvas-draw-text.svg)](https://www.npmjs.com/package/skia-canvas-draw-text)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)

## Features

* Returns a canvas sized to fit the text, or draws straight onto your own context
* Word wrapping, with long words broken onto the next line
* Shrinks the font to the largest size that fits a width or height
* Text shadows and outlines, with room made for them in the returned canvas
* Multi-line text placed on a context with `align` and `baseline`, the same as `fillText`
* Emoji drawn as Twemoji and measured as drawn, through [skia-canvas-with-twemoji](https://github.com/ewanhowell5195/skia-canvas-with-twemoji)
* Synchronous, and leaves your context's own state untouched
* TypeScript types included

## Install
```bash
npm install skia-canvas-draw-text
```

## Quick Start
```js
import drawText from "skia-canvas-draw-text"

const text = drawText("Hello there! 👋", {
  fontSize: 50,
  colour: "#f0f"
})

text.saveAs("out.png")
```

## Options

`drawText(text, options)`. All options are optional, and the options object is never changed.

| Option | Default | Description |
|---|---|---|
| `ctx` | | A context to also draw the text onto |
| `location` | `[0, 0]` | Where to draw on the `ctx`, placed with `align` and `baseline` like `fillText` |
| `colour` | `"#000"` | The colour of the text |
| `fontSize` | `10` | The size of the text, before any shrinking |
| `minFontSize` | `1` | The smallest size the text can shrink to |
| `fontFamily` | `"sans-serif"` | The font family of the text |
| `fontWeight` | | The font weight, eg `"bold"` or `600` |
| `fontStyle` | | The font style, eg `"italic"` |
| `maxWidth` | | The font shrinks to the largest size where the text fits this width. Wrapped text wraps at it, and shrinks until no word has to be broken |
| `maxHeight` | | The font shrinks to the largest size where the text fits this height |
| `wrap` | `false` | Wrap words at the `maxWidth`, or the `ctx`'s canvas width when there is no `maxWidth` |
| `align` | `"left"` | `"left"`, `"center"` or `"right"`. Aligns the lines with each other, and sets which side of the text sits at the `location` |
| `baseline` | `"alphabetic"` | Which part of the text sits at the `location`: `"top"` of the first line, `"bottom"` of the last line, the `"middle"` between them, or the first line's `"alphabetic"`, `"hanging"` or `"ideographic"` baseline |
| `lineHeight` | `1` | The distance between lines, as a multiple of the font's line height |
| `outlineColour` | `"#000"` | The colour of the text outline |
| `outlineWidth` | `0` | The width of the text outline in pixels, drawn outside the text. Emoji are not outlined |
| `shadowColour` | `"#000"` | The colour of the text shadow |
| `shadowBlur` | `0` | The blur of the text shadow in pixels |
| `shadowOffset` | `[0, 0]` | The `[x, y]` offset of the text shadow in pixels |
| `padding` | `[0, 0, 0, 0]` | Space added around the text in the returned canvas, as `[top, right, bottom, left]`. It does not move text drawn on a `ctx` |

`maxWidth` and `maxHeight` include the shadow and outline. A word longer than `maxWidth` at the `minFontSize` is broken across lines with a hyphen.

`\n` always starts a new line. Spaces and tabs inside a line are kept as written, and whitespace at the end of a line is dropped.

## Return value

A canvas with the text drawn on it is always returned, with these properties set. With a `ctx`, the same canvas is also drawn onto it.

| Property | Description |
|---|---|
| `textWidth` | The width of the text, without padding, shadow or outline |
| `textHeight` | The height of the text, without padding, shadow or outline |
| `fontSize` | The font size the text was drawn at |
| `padding` | Where the text sits in the canvas, as `[top, right, bottom, left]`: the `padding` option plus the space added for shadows, outlines and glyphs that extend past the text |

## Examples

### Drawing text and saving to a file
```js
const text = drawText("Hello there!")

text.saveAs("out.png")
```
```js
const text = drawText("omg flushed emoji and weary emoji are kissing\n\n😳💋😩", {
  colour: "red",
  fontSize: 50,
  fontFamily: "Arial",
  maxWidth: 512,
  maxHeight: 512,
  align: "center",
  wrap: true,
  lineHeight: 1.2,
  shadowColour: "#000",
  shadowBlur: 5,
  shadowOffset: [10, 10],
  fontWeight: "bold"
})

text.saveAs("out.png")
```

### Drawing to an existing canvas
```js
import { Canvas } from "skia-canvas"
import drawText from "skia-canvas-draw-text"

const canvas = new Canvas(1024, 1024)
const ctx = canvas.getContext("2d")
ctx.fillStyle = "white"
ctx.fillRect(0, 0, 1024, 1024)
ctx.fillStyle = "orange"
ctx.fillRect(500, 500, 24, 24)

drawText("This is a test\nwith multiple lines of text\nto show alignment and stuff.", {
  ctx,
  location: [512, 512],
  colour: "red",
  fontSize: 50,
  fontFamily: "Arial",
  maxWidth: 512,
  maxHeight: 512,
  align: "right",
  baseline: "middle",
  outlineWidth: 3,
  wrap: true,
  shadowColour: "#000",
  shadowBlur: 5,
  shadowOffset: [20, 20],
  fontWeight: "bold"
})

canvas.saveAs("out.png")
```

## License

[MPL-2.0](LICENSE) © [Ewan Howell](https://ewanhowell.com/)