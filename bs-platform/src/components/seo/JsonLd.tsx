export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape `<` so user-controlled fields containing `</script>` cannot break out
  // of the script tag and inject markup.
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
