/**
 * Trim whitespace from favicon, make background transparent, and regenerate sizes.
 * Run: node scripts/regenerate-favicons.mjs
 */
import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const inputPath = join(publicDir, 'favicon-f-whip.png')

const WHITE_THRESHOLD = 235 // treat pixel as "white" if r,g,b >= this (for trim + transparency)

async function main() {
  const input = sharp(inputPath)
  const meta = await input.metadata()
  const { width, height } = meta
  const channels = 4
  const { data } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  // Find bounding box of non-background pixels (not white and not transparent)
  const ALPHA_THRESHOLD = 20
  let minX = width, minY = height, maxX = 0, maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3] ?? 255
      const isWhite = r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD
      const isTransparent = a < ALPHA_THRESHOLD
      const isContent = !isWhite && !isTransparent
      if (isContent) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  const cropWidth = maxX - minX + 1
  const cropHeight = maxY - minY + 1
  const padding = Math.max(1, Math.floor(Math.min(cropWidth, cropHeight) * 0.08))
  const outWidth = cropWidth + padding * 2
  const outHeight = cropHeight + padding * 2

  // Extract region and make white pixels transparent
  const cropped = await sharp(inputPath)
    .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const outData = Buffer.alloc(outWidth * outHeight * channels)
  const cropBuf = cropped.data
  const cw = cropWidth
  const ch = cropHeight

  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      const outI = (y * outWidth + x) * channels
      if (x < padding || x >= padding + cw || y < padding || y >= padding + ch) {
        outData[outI] = 0
        outData[outI + 1] = 0
        outData[outI + 2] = 0
        outData[outI + 3] = 0
        continue
      }
      const sx = x - padding
      const sy = y - padding
      const srcI = (sy * cw + sx) * channels
      const r = cropBuf[srcI]
      const g = cropBuf[srcI + 1]
      const b = cropBuf[srcI + 2]
      const a = cropBuf[srcI + 3]
      const isWhite = r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD
      const isTransparent = (a ?? 255) < ALPHA_THRESHOLD
      outData[outI] = r
      outData[outI + 1] = g
      outData[outI + 2] = b
      outData[outI + 3] = (isWhite || isTransparent) ? 0 : (a ?? 255)
    }
  }

  const trimmed = sharp(outData, {
    raw: { width: outWidth, height: outHeight, channels }
  }).png()

  const trimmedPath = join(publicDir, 'favicon-f-whip.png')
  await trimmed.toFile(trimmedPath)
  console.log('Trimmed and made transparent:', trimmedPath, `(${outWidth}x${outHeight})`)

  const sizes = [
    [16, 'favicon-16x16.png'],
    [32, 'favicon-32x32.png'],
    [48, 'favicon-48x48.png'],
    [180, 'apple-touch-icon.png'],
    [512, 'favicon-512x512.png']
  ]

  for (const [size, name] of sizes) {
    const outPath = join(publicDir, name)
    await sharp(trimmedPath)
      .resize(size, size)
      .png()
      .toFile(outPath)
    console.log('Wrote', name)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
