import { getLocale, getTranslations } from 'next-intl/server'
import { Download } from 'lucide-react'
import { requireAdminAccess } from '@/lib/admin/require-admin'
import { getLandingLeads } from '@/lib/admin/get-landing-leads'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'

/** Leads captured by the growth-guide landing page. */
export default async function AdminLeadsPage() {
  const locale = await getLocale()
  const t = await getTranslations('admin_leads')
  await requireAdminAccess(locale)
  const leads = await getLandingLeads()

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('subtitle', { count: leads.length })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t('storage_note')}</p>
        </div>
        {/* Marketing item 1: one-click Excel export. */}
        <a
          href="/api/admin/leads/export"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          {t('export_csv')}
        </a>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-4 sm:p-6">
          {leads.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Download className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>{t('empty')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('whatsapp')}</TableHead>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('size')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{l.job_title ?? '—'}</TableCell>
                    <TableCell dir="ltr" className="num-en text-start">
                      <a href={`https://wa.me/${l.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {l.whatsapp}
                      </a>
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      <a href={`mailto:${l.email}`} className="text-primary hover:underline">
                        {l.email}
                      </a>
                    </TableCell>
                    <TableCell className="num-en">{l.company_size ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(l.created_at, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = { title: 'Guide leads — Admin' }
