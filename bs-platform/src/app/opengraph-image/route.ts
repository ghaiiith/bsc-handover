export const runtime = 'edge'

const OG_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Business Skills">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B1220"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#045F6B"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(520, 200)">
    <path fill="#E57D17" d="M38 8h14c11.5 0 19.5 7.2 19.5 17.4 0 6.8-3.6 12.2-9.4 14.6 7.2 2.2 12.4 8.6 12.4 17.8 0 12.2-9.8 20.2-23.8 20.2H38V8zm10 18.2h5.2c5.4 0 8.8-3 8.8-7.4 0-4.2-3.4-7.2-8.8-7.2H48v14.6zm0 24.4h6c6.6 0 11-3.8 11-9.2 0-5.6-4.4-9-11-9h-6v18.2z"/>
    <path fill="#045F6B" d="M10 28.5C10 16.8 22.2 8 38 8c9.2 0 16.8 3.2 21 8.6l-8.4 10.2c-3.2-3.8-7.8-6-13.2-6-7.4 0-12.4 4-12.4 9.6 0 5.8 5.2 9.4 16.2 11.4 14.2 2.6 22.8 9.2 22.8 21.2 0 13.4-12.6 22.2-30.4 22.2-11.2 0-20.6-4.2-24.8-10.4l9.6-11.8c3.8 5.2 9.8 8.2 16.6 8.2 7.8 0 12.4-3.4 12.4-8.2 0-4.8-4.4-8-15.4-9.8-12.8-2.2-20.4-8.6-20.4-19.4z"/>
  </g>
  <text x="600" y="340" fill="#F9FAFB" font-size="64" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">Business Skills</text>
  <text x="600" y="410" fill="#F9FAFB" fill-opacity="0.9" font-size="28" text-anchor="middle" font-family="system-ui, sans-serif">Learn skills. Build opportunities.</text>
  <text x="600" y="460" fill="#F9FAFB" fill-opacity="0.75" font-size="22" text-anchor="middle" font-family="system-ui, sans-serif">Courses · Jobs · Services · Certificates</text>
</svg>`

export async function GET() {
  return new Response(OG_SVG, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
