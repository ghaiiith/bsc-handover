import { getAllUsersForExport } from '@/lib/admin/get-admin-users'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'
import { escapeCsvCell } from '@/lib/csv/escape'

export async function GET() {
  if (!(await verifyAdminApi())) {
    return new Response('Unauthorized', { status: 401 })
  }

  const users = await getAllUsersForExport()

  const header = 'name,email,role,status,joined_date\n'
  const rows = users
    .map((u) => {
      const name = escapeCsvCell(u.full_name ?? '')
      const email = escapeCsvCell(u.email)
      const role = escapeCsvCell(u.role)
      const status = escapeCsvCell(u.is_active ? 'active' : 'banned')
      const joined = escapeCsvCell(u.created_at.slice(0, 10))
      return `${name},${email},${role},${status},${joined}`
    })
    .join('\n')

  return new Response(header + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="users.csv"',
    },
  })
}
