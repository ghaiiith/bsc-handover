'use client'

const UNSUPPORTED_COLOR_RE = /oklab|oklch|lab\(|lch\(|color\(/i

const SKIP_PROPERTIES = new Set([
  'box-shadow',
  'filter',
  'backdrop-filter',
  'border-image',
  'border-image-source',
  'background',
])

const COLOR_PROPERTIES = new Set([
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'lighting-color',
])

let colorProbeCanvas: HTMLCanvasElement | null = null

function colorToRgb(color: string): string {
  if (!color || color === 'none' || color === 'transparent') return color
  if (/^rgb/i.test(color)) return color
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color
  if (!UNSUPPORTED_COLOR_RE.test(color)) return color

  if (!colorProbeCanvas) {
    colorProbeCanvas = document.createElement('canvas')
    colorProbeCanvas.width = 1
    colorProbeCanvas.height = 1
  }

  const ctx = colorProbeCanvas.getContext('2d')
  if (!ctx) return '#000000'

  try {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#000000'
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    if (a === 0) return 'transparent'
    if (a < 255) return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
    return `rgb(${r}, ${g}, ${b})`
  } catch {
    return '#000000'
  }
}

function resolveCSSValue(property: string, value: string): string {
  if (!value) return value

  if (SKIP_PROPERTIES.has(property)) {
    return 'none'
  }

  if (property === 'background-image' && value !== 'none') {
    return 'none'
  }

  if (COLOR_PROPERTIES.has(property) || UNSUPPORTED_COLOR_RE.test(value)) {
    return colorToRgb(value)
  }

  if (property === 'background' && UNSUPPORTED_COLOR_RE.test(value)) {
    const colorMatch = value.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/i)
    return colorMatch ? colorMatch[0] : 'none'
  }

  if (UNSUPPORTED_COLOR_RE.test(value)) {
    return colorToRgb(value)
  }

  return value
}

function getSafeBackgroundColor(source: HTMLElement): string {
  const computed = window.getComputedStyle(source)
  const bgColor = resolveCSSValue('background-color', computed.backgroundColor)
  if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
    return bgColor
  }

  if (source.tagName === 'ASIDE') return '#ea580c'
  if (source.id === 'certificate-document') return '#fffdf8'
  return '#ffffff'
}

function inlineSafeStyles(source: Element, clone: Element): void {
  if (!(source instanceof HTMLElement) || !(clone instanceof HTMLElement)) return

  clone.removeAttribute('class')

  const computed = window.getComputedStyle(source)
  for (let i = 0; i < computed.length; i++) {
    const property = computed.item(i)
    if (!property || SKIP_PROPERTIES.has(property)) continue

    const raw = computed.getPropertyValue(property)
    const safe = resolveCSSValue(property, raw)
    clone.style.setProperty(property, safe, computed.getPropertyPriority(property))
  }

  if (computed.backgroundImage !== 'none') {
    clone.style.backgroundImage = 'none'
    clone.style.backgroundColor = getSafeBackgroundColor(source)
  }

  if (computed.writingMode !== 'horizontal-tb') {
    clone.style.writingMode = 'horizontal-tb'
    clone.style.transform = 'none'
    clone.style.setProperty('rotate', 'none')
  }

  if (source instanceof SVGElement || clone instanceof SVGElement) {
    const fill = computed.getPropertyValue('fill')
    const stroke = computed.getPropertyValue('stroke')
    if (fill) clone.style.fill = resolveCSSValue('fill', fill)
    if (stroke) clone.style.stroke = resolveCSSValue('stroke', stroke)
  }

  const sourceChildren = Array.from(source.children)
  const cloneChildren = Array.from(clone.children)
  for (let i = 0; i < sourceChildren.length; i++) {
    if (cloneChildren[i]) {
      inlineSafeStyles(sourceChildren[i], cloneChildren[i])
    }
  }

  sanitizeSvgAttributes(source, clone)
}

function sanitizeSvgAttributes(source: Element, clone: Element): void {
  if (source instanceof SVGElement && clone instanceof SVGElement) {
    const computed = window.getComputedStyle(source)

    for (const attr of ['fill', 'stroke'] as const) {
      const attrValue = source.getAttribute(attr)
      const value =
        attrValue === 'currentColor' || !attrValue
          ? computed.getPropertyValue(attr)
          : attrValue
      if (value && value !== 'none') {
        clone.setAttribute(attr, colorToRgb(value))
      }
    }
  }

  const sourceChildren = Array.from(source.children)
  const cloneChildren = Array.from(clone.children)
  for (let i = 0; i < sourceChildren.length; i++) {
    if (cloneChildren[i]) {
      sanitizeSvgAttributes(sourceChildren[i], cloneChildren[i])
    }
  }
}

function buildExportNode(source: HTMLElement, width: number, height: number): {
  iframe: HTMLIFrameElement
  target: HTMLElement
} {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = `${width}px`
  iframe.style.height = `${height}px`
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    document.body.removeChild(iframe)
    throw new Error('iframe_unavailable')
  }

  doc.open()
  doc.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#fffdf8;"></body></html>'
  )
  doc.close()

  const clone = source.cloneNode(true) as HTMLElement
  clone.style.width = `${width}px`
  clone.style.height = `${height}px`
  clone.style.maxWidth = 'none'
  clone.style.aspectRatio = 'auto'
  clone.style.boxShadow = 'none'
  clone.style.margin = '0'

  doc.body.appendChild(clone)
  inlineSafeStyles(source, clone)

  return { iframe, target: clone }
}

export async function downloadCertificatePdf(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const rect = element.getBoundingClientRect()
  const width = Math.max(Math.ceil(rect.width), 1)
  const height = Math.max(Math.ceil(rect.height), 1)

  const { iframe, target } = buildExportNode(element, width, height)

  try {
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#fffdf8',
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      foreignObjectRendering: false,
    })

    if (!canvas.width || !canvas.height) {
      throw new Error('empty_canvas')
    }

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 8
    const maxWidth = pageWidth - margin * 2
    const maxHeight = pageHeight - margin * 2

    const imageAspect = canvas.width / canvas.height
    const pageAspect = maxWidth / maxHeight

    let renderWidth = maxWidth
    let renderHeight = maxHeight

    if (imageAspect > pageAspect) {
      renderHeight = maxWidth / imageAspect
    } else {
      renderWidth = maxHeight * imageAspect
    }

    const offsetX = margin + (maxWidth - renderWidth) / 2
    const offsetY = margin + (maxHeight - renderHeight) / 2

    pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST')
    pdf.save(`${fileName}.pdf`)
  } finally {
    iframe.remove()
  }
}
