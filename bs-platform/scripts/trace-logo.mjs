// One-off logo vectorizer: PNG -> clean SVG using @neplex/vectorizer (WASM vtracer).
// Usage: node scripts/trace-logo.mjs [inputPng] [outputSvg]
//   defaults: public/logo-source.png -> public/logo-traced.svg
import { readFile, writeFile } from 'node:fs/promises'
import {
  vectorize,
  ColorMode,
  Hierarchical,
  PathSimplifyMode,
} from '@neplex/vectorizer'

const input = process.argv[2] ?? 'public/image.png'
const output = process.argv[3] ?? 'public/logo-traced.svg'

const png = await readFile(input)

const svg = await vectorize(png, {
  colorMode: ColorMode.Color,
  // Flat brand logo has very few colors; keep precision modest to merge shades.
  colorPrecision: 6,
  // Drop tiny speckles / anti-aliasing noise.
  filterSpeckle: 8,
  // Curve fitting: spline gives smooth bezier paths (not polygons).
  mode: PathSimplifyMode.Spline,
  cornerThreshold: 60,
  spliceThreshold: 45,
  lengthThreshold: 4,
  maxIterations: 10,
  // Stacked = paint regions on top of each other (good for overlapping B/S).
  hierarchical: Hierarchical.Stacked,
  layerDifference: 16,
  pathPrecision: 3,
})

await writeFile(output, svg)
console.log(`Traced ${input} -> ${output} (${svg.length} bytes)`)
