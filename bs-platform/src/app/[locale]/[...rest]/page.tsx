import { notFound } from 'next/navigation'

/** Catch-all for unknown paths — renders the branded [locale]/not-found page. */
export default function CatchAllNotFound() {
  notFound()
}
