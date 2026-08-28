'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

// ── Login ─────────────────────────────────────────────────────────────────
export async function loginAction(formData: FormData) {
  const username = (formData.get('username') as string)?.toLowerCase().trim();
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Veuillez remplir tous les champs.' };
  }

  const { rows } = await pool.query(
    `SELECT id, password_hash, role, full_name
     FROM   admin_users
     WHERE  username = $1
     LIMIT  1`,
    [username]
  );
  const user = rows[0];

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
  try {
    const { rows } = await pool.query(
      `SELECT id, username, full_name, role, created_at
       FROM   admin_users
       ORDER  BY created_at ASC`
    );
    return { data: rows };
  } catch {
    return { error: 'Erreur de chargement.' };
  }
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

  try {
    await pool.query(
      `INSERT INTO admin_users (username, password_hash, role, full_name)
       VALUES ($1, $2, $3, $4)`,
      [username, hash, role, full_name]
    );
    return { success: true };
  } catch (err: any) {
    if (err.code === '23505') return { error: "Ce nom d'utilisateur est déjà pris." };
    return { error: 'Erreur lors de la création.' };
  }
}

// ── Remove user ───────────────────────────────────────────────────────────
export async function removeEmployeeAction(id: string) {
  try {
    await pool.query(`DELETE FROM admin_users WHERE id = $1`, [id]);
    return { success: true };
  } catch {
    return { error: 'Erreur lors de la suppression.' };
  }
}
