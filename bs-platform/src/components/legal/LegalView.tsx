import Navbar from '@/components/shared/Navbar'
import type { LegalDocument } from '@/lib/legal/content'

export default function LegalView({ doc }: { doc: LegalDocument }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">{doc.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{doc.updated}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{doc.intro}</p>
        </header>

        <div className="space-y-8">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-2 text-lg font-semibold">{section.heading}</h2>
              <div className="space-y-2">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  )
}
