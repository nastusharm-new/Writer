// Pasted/dropped sketches and reference images are stored as data URIs
// directly on the card (see Card.images) — no Storage bucket, no separate
// upload step. Downscaling before storing keeps a phone photo from turning
// into a multi-megabyte row.
const MAX_DIMENSION = 1400
const JPEG_QUALITY = 0.82

function readAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function downscale(dataUri: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
      // Already small enough, and not a format worth re-encoding — keep it
      // byte-for-byte (also sidesteps canvas taint issues for odd formats).
      if (scale === 1) {
        resolve(dataUri)
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUri)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.onerror = () => resolve(dataUri)
    img.src = dataUri
  })
}

export async function fileToDataUri(file: File): Promise<string> {
  const raw = await readAsDataUri(file)
  return downscale(raw)
}
