# skia-canvas-draw-text

### A function to make drawing text easier with skia-canvas

```js
await drawText("Hello there!")
```

## Install
```console
$ npm i skia-canvas-draw-text
```

## Usage
```js
import drawText from "skia-canvas-draw-text"

await drawText(textString, arguments)
```

## Arguments
Certain arguments are not needed if no context is provided. These are marked with *
- ctx
  - `ctx: canvas.getContext("2d")`
  - The context to draw to
  - If no context is provided, the function will return a canvas with the text drawn on it
- location*
  -  `location: [512, 512]`
  - Location to draw the text
- colour
  - `colour: "red"`
  - The colour of the text
- fontSize
  - `fontSize: 50`
  - The size of the text
- fontFamily
  - `fontFamily: "Arial"`
  - The font family of the text
- width
  - `width: 512`
  - The maximum width of the text area
  - The font size will shrink until the text fits within the width
- height
  - `height: 512`
  - The maximum height of the text area
  - The font size will shrink until the text fits within height
  - Requires a width and word wrapping enabled
- align
  - `align: "left"`
  - How to align the text
  - `left`, `center`, `right`
- baseline*
  - `baseline: "top"`
  - The text baseline
  - Requires word wrapping disabled
  - `top`, `middle`, `bottom`
- gravity*
  - `gravity: "ne"`
  - What corner/side to draw the output text image from 
  - Requires word wrapping enabled
  - `n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`, `c`
- wrap
  - `wrap: true`
  - Enable word wrapping
  - Requires a width
- spacing
  - `spacing: 100`
  - The size of the vertical spacing between the lines
- shadowColour
  - `shadowColour: "#000"`
  - The colour of the text shadow
- shadowBlur
  - `shadowBlur: 5`
  - The blur amount of the text shadow
- shadowOffset
  - `shadowOffset: [10, 10]`
  - The offset amount of the text shadow
- bold
  - `bold: true`
  - Set the text to be bold

## Return value
When no `ctx` is provided, a canvas is returned.
This canvas has some custom properties set on it.
- canvas.textWidth
  - The width of the text in the output canvas
- canvas.textHeight
  - The height of the text in the output canvas
- canvas.padding
  - The size of the padding on each side of the text, in the order `[top, right, bottom, left]`

## Examples

### Drawing text and saving to a file
```js
const text = await drawText("Hello there!")

text.saveAs("out.png")
```
```js
const text = await drawText("This is an example", {
  fontSize: 50,
  colour: "#f0f"
})

text.saveAs("out.png")
```
```js
const text = await drawText("omg flushed emoji and weary emoji are kissing\n\n", {
  colour: "red",
  fontSize: 50,
  fontFamily: "Arial",
  width: 512,
  height: 512,
  align: "center",
  wrap: true,
  spacing: 20,
  shadowColour: "#000",
  shadowBlur: 5,
  shadowOffset: [10, 10],
  bold: true
})

text.saveAs("out.png")
```

### Drawing to an existing canvas
```js
const canvas = new Canvas(1024, 1024)
const ctx = canvas.getContext("2d")
ctx.fillStyle = "white"
ctx.fillRect(0, 0, 1024, 1024)
ctx.fillStyle = "orange"
ctx.fillRect(500, 500, 24, 24)

const text = await drawText("This is a test\nwith multiple lines of text\nto show gravity and stuff.", {
  ctx,
  location: [512, 512],
  colour: "red",
  fontSize: 50,
  fontFamily: "Arial",
  width: 512,
  height: 512,
  align: "left",
  gravity: "e",
  wrap: true,
  shadowColour: "#000",
  shadowBlur: 5,
  shadowOffset: [20, 20],
  bold: true
})

text.saveAs("out.png")
```