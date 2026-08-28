/**
 * meta-identity.ts
 *
 * Lightweight, fail-safe helpers for persisting customer PII to localStorage so
 * that Meta Pixel Advanced Matching fields (em, ph, fn, ln) can be populated on
 * AddToCart and InitiateCheckout events — even before a Purchase is completed.
 *
 * SECURITY NOTE:
 *   Raw values are stored in localStorage only (client-side). They are NEVER sent
 *   to Meta directly from here. The server-side CAPI route (/api/meta/events) is
 *   the only place they are SHA-256 hashed before being forwarded to Meta.
 *
 * USAGE:
 *   import { persistMetaIdentity, getMetaIdentity } from '@/lib/meta-identity';
 *
 *   // Write (e.g. onBlur, at submit time)
 *   persistMetaIdentity({ email: 'user@example.com', firstName: 'Jane' });
 *
 *   // Read (e.g. inside fireServer before CAPI call)
 *   const { email, phone, firstName, lastName } = getMetaIdentity();
 */

/** Storage keys — single source of truth. */
const KEYS = {
  email:     'nyvara_user_email',
  phone:     'nyvara_user_phone',
  firstName: 'nyvara_user_first_name',
  lastName:  'nyvara_user_last_name',
} as const;

export interface MetaIdentity {
  email?:     string;
  phone?:     string;
  firstName?: string;
  lastName?:  string;
}

/**
 * Persist any supplied identity fields to localStorage.
 * Only writes a key if the supplied value is a non-empty string after normalization.
 * Safe to call on every blur/submit — throws are silently swallowed so the
 * checkout flow is never disrupted by a storage error.
 */
export function persistMetaIdentity(fields: MetaIdentity): void {
  try {
    if (typeof window === 'undefined') return; // SSR guard

    if (fields.email) {
      const normalized = fields.email.trim().toLowerCase();
      if (normalized.length > 0) localStorage.setItem(KEYS.email, normalized);
    }

    if (fields.phone) {
      const normalized = fields.phone.trim();
      if (normalized.length > 0) localStorage.setItem(KEYS.phone, normalized);
    }

    if (fields.firstName) {
      const normalized = fields.firstName.trim();
      if (normalized.length > 0) localStorage.setItem(KEYS.firstName, normalized);
    }

    if (fields.lastName) {
      const normalized = fields.lastName.trim();
      if (normalized.length > 0) localStorage.setItem(KEYS.lastName, normalized);
    }
  } catch {
    // localStorage may be unavailable (private browsing quota exceeded, etc.).
    // Silently ignore — tracking enrichment is best-effort, never blocking.
  }
}

/**
 * Read all persisted identity fields from localStorage.
 * Returns undefined for any field that was not previously saved.
 * Safe to call server-side — returns an empty object when window is unavailable.
 */
export function getMetaIdentity(): MetaIdentity {
  if (typeof window === 'undefined') return {};

  try {
    return {
      email:     localStorage.getItem(KEYS.email)     ?? undefined,
      phone:     localStorage.getItem(KEYS.phone)     ?? undefined,
      firstName: localStorage.getItem(KEYS.firstName) ?? undefined,
      lastName:  localStorage.getItem(KEYS.lastName)  ?? undefined,
    };
  } catch {
    return {};
  }
}
