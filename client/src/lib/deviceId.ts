/**
 * Generate and manage device ID for wishlist tracking
 * Uses combination of UUID and IP address (on server) for persistence
 */

function generateRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const DEVICE_ID_KEY = 'nyvara_device_id';
const DEVICE_ID_VERSION = 'v1';

/**
 * Get or generate device ID for current browser
 * Device ID persists in localStorage for this machine
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    // Server-side: generate temporary
    return generateRandomId();
  }

  // Check if already stored
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  if (stored && stored.startsWith(DEVICE_ID_VERSION)) {
    return stored.substring(DEVICE_ID_VERSION.length);
  }

  // Generate new and store
  const deviceId = generateRandomId();
  localStorage.setItem(DEVICE_ID_KEY, DEVICE_ID_VERSION + deviceId);
  return deviceId;
}

/**
 * Clear device ID (logout equivalent)
 */
export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEVICE_ID_KEY);
  }
}

/**
 * Get device fingerprint for analytics
 */
export async function getDeviceFingerprint(): Promise<string> {
  const deviceId = getDeviceId();
  const timestamp = Math.floor(Date.now() / 60000); // Round to minute for privacy
  
  // Combine device ID with time window (changes every minute)
  // This allows tracking behavior within a session but prevents long-term tracking
  return `${deviceId}-${timestamp}`;
}
