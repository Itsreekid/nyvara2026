import { NextRequest } from 'next/server';

interface FacebookCookies {
  fbc: string | null;
  fbp: string | null;
}

/**
 * Reads _fbc and _fbp cookies, and constructs fbc from fbclid query parameter if _fbc is missing.
 */
export function getFacebookCookies(req: NextRequest, eventSourceUrl?: string): FacebookCookies {
  let fbc: string | null = null;
  let fbp: string | null = null;

  // 1. Read from request cookies
  fbc = req.cookies.get('_fbc')?.value ?? null;
  fbp = req.cookies.get('_fbp')?.value ?? null;

  // 2. If _fbc cookie is missing, look for fbclid to construct it manually
  if (!fbc) {
    let fbclid: string | null = null;

    // Check query params of the incoming request URL
    fbclid = req.nextUrl.searchParams.get('fbclid');

    // If not found, check eventSourceUrl query params (passed from the client body)
    if (!fbclid && eventSourceUrl) {
      try {
        const url = new URL(eventSourceUrl);
        fbclid = url.searchParams.get('fbclid');
      } catch {
        // Safe fallback in case of invalid URL
      }
    }

    // If still not found, check the Referer header query params
    if (!fbclid) {
      const referer = req.headers.get('referer');
      if (referer) {
        try {
          const url = new URL(referer);
          fbclid = url.searchParams.get('fbclid');
        } catch {
          // Safe fallback
        }
      }
    }

    // Format: fb.1.{timestamp_in_ms}.{fbclid_value}
    if (fbclid) {
      fbc = `fb.1.${Date.now()}.${fbclid}`;
    }
  }

  return { fbc, fbp };
}
