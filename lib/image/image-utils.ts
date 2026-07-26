export function compressDataUrl(
  dataUrl: string,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.9
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

export async function compressImageFromCanvas(
  canvas: HTMLCanvasElement,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.9
): Promise<string> {
  const width = canvas.width
  const height = canvas.height

  if (width <= maxWidth && height <= maxHeight) {
    return canvas.toDataURL('image/jpeg', quality)
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height)
  const newWidth = Math.round(width * ratio)
  const newHeight = Math.round(height * ratio)

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = newWidth
  outputCanvas.height = newHeight

  const ctx = outputCanvas.getContext('2d')
  if (!ctx) {
    return canvas.toDataURL('image/jpeg', quality)
  }

  ctx.drawImage(canvas, 0, 0, newWidth, newHeight)
  return outputCanvas.toDataURL('image/jpeg', quality)
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
