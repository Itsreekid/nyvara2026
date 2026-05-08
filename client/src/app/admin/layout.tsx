import { cookies } from 'next/headers';
import AdminShell from '@/components/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const role = cookieStore.get('nyvara_admin_session')?.value;

  // No session → render login page bare (no sidebar/header)
  if (!role) {
    return <>{children}</>;
  }

  return <AdminShell role={role}>{children}</AdminShell>;
}
