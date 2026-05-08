'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import supabaseAdmin from '@/lib/supabase-admin';

// ── Login ─────────────────────────────────────────────────────────────────
export async function loginAction(formData: FormData) {
  const username = (formData.get('username') as string)?.toLowerCase().trim();
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Veuillez remplir tous les champs.' };
  }

  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('id, password_hash, role, full_name')
    .eq('username', username)
    .single();

  if (!user) return { error: 'Identifiants incorrects.' };

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return { error: 'Identifiants incorrects.' };

  const cookieStore = await cookies();
  cookieStore.set('nyvara_admin_session', user.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return { success: true, role: user.role as string };
}

// ── Logout ────────────────────────────────────────────────────────────────
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('nyvara_admin_session');
}

// ── Get all users ─────────────────────────────────────────────────────────
export async function getEmployeesAction() {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('id, username, full_name, role, created_at')
    .order('created_at', { ascending: true });

  if (error) return { error: 'Erreur de chargement.' };
  return { data };
}

// ── Add user ──────────────────────────────────────────────────────────────
export async function addEmployeeAction(formData: FormData) {
  const username  = (formData.get('username')  as string)?.toLowerCase().trim();
  const password  = formData.get('password')  as string;
  const full_name = formData.get('full_name') as string;
  const role      = formData.get('role')      as string;

  if (!username || !password || !full_name || !role) {
    return { error: 'Tous les champs sont requis.' };
  }

  const hash = await bcrypt.hash(password, 12);

  const { error } = await supabaseAdmin.from('admin_users').insert({
    username, password_hash: hash, role, full_name,
  });

  if (error) {
    if (error.code === '23505') return { error: "Ce nom d'utilisateur est déjà pris." };
    return { error: 'Erreur lors de la création.' };
  }
  return { success: true };
}

// ── Remove user ───────────────────────────────────────────────────────────
export async function removeEmployeeAction(id: string) {
  const { error } = await supabaseAdmin
    .from('admin_users')
    .delete()
    .eq('id', id);

  if (error) return { error: 'Erreur lors de la suppression.' };
  return { success: true };
}
