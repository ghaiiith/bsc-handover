import Navbar from '@/components/shared/Navbar'
import { getSessionProfile } from '@/lib/auth/profile'

export default async function AppNavbar() {
  const session = await getSessionProfile()
  return <Navbar initialUser={session?.profile ?? null} />
}
