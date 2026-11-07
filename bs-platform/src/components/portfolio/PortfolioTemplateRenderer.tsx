import { splitTemplate } from '@/lib/portfolio/template-sanitize'

interface PortfolioTemplateRendererProps {
  /** Already rendered (data filled in) and sanitized template HTML. */
  html: string
}

/**
 * Report BS-35: renders an uploaded template inside the app shell. The document
 * is split so its <style> blocks are scoped-ish under one wrapper and its body
 * markup is injected. Scripts were stripped at upload time and every profile
 * value was escaped by the template engine.
 */
export default function PortfolioTemplateRenderer({ html }: PortfolioTemplateRendererProps) {
  const { css, body } = splitTemplate(html)

  return (
    <div className="portfolio-template-root">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  )
}
