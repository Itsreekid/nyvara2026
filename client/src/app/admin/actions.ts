'use server';

import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

/** Returns true only when the actual request arrived over HTTPS.
 *  Works behind reverse-proxies (Coolify / Nginx) that set x-forwarded-proto.
 *  Falls back to NODE_ENV so local `next dev` (http) stays cookieless-secure-off too.
 */
async function isHttps(): Promise<boolean> {
  const hdrs = await headers();
  const proto = hdrs.get('x-forwarded-proto') ?? hdrs.get('x-forwarded-ssl');
  if (proto) return proto.split(',')[0].trim() === 'https';
  return process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
}

// ── Login ─────────────────────────────────────────────────────────────────
export async function loginAction(formData: FormData) {
  const username = (formData.get('username') as string)?.toLowerCase().trim();
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Veuillez remplir tous les champs.' };
  }

  // 1. Fallback / Master admin check using ENV variable
  if (username === 'admin' && password === process.env.ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set('nyvara_admin_session', 'master', {
      httpOnly: true,
      secure: await isHttps(),
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return { success: true, role: 'master' };
  }

  // 2. Database check for employee accounts
  let user: any = null;
  try {
    const { rows } = await pool.query(
      `SELECT id, password_hash, role, full_name
       FROM   admin_users
       WHERE  username = $1
       LIMIT  1`,
      [username]
    );
    user = rows[0];
  } catch (err) {
    console.warn('admin_users table query failed (might not exist yet):', err);
  }

  if (!user) return { error: 'Identifiants incorrects.' };

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return { error: 'Identifiants incorrects.' };

  const cookieStore = await cookies();
  cookieStore.set('nyvara_admin_session', user.role, {
    httpOnly: true,
    secure: await isHttps(),
    sameSite: 'lax',
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
