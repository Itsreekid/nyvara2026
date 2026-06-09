import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID!;
const ACCESS_TOKEN = process.env.FB_CONVERSIONS_API_TOKEN!;
const API_VERSION = 'v19.0';

/** SHA-256 hash a value for PII (required by Meta) */
function hash(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      event_id,        // Must match the client-side pixel event_id
      order_id,
      value,
      email,
      phone,
      first_name,
      last_name,
      city,
      country,
      content_ids,    // array of product IDs
      num_items,
    } = body;

    // Build user data — hash all PII
    const userData: Record<string, string | string[]> = {
      client_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '',
      client_user_agent: req.headers.get('user-agent') ?? '',
    };
    if (email)      userData.em = hash(email);
    if (phone)      userData.ph = hash(phone.replace(/\D/g, '')); // digits only
    if (first_name) userData.fn = hash(first_name);
    if (last_name)  userData.ln = hash(last_name);
    if (city)       userData.ct = hash(city);
    if (country)    userData.country = hash(country);

    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id,          // deduplication key
          event_source_url:  req.headers.get('referer') ?? 'https://nyvara.net',
          action_source:     'website',
          user_data:         userData,
          custom_data: {
            currency:     'TND',
            value:        value,
            order_id,
            content_ids,
            num_items,
            content_type: 'product',
          },
        },
      ],
      test_event_code: process.env.META_TEST_EVENT_CODE ?? undefined, // remove in production
    };

    const fbRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const fbData = await fbRes.json();

    if (!fbRes.ok) {
      console.error('[Meta CAPI] Error:', fbData);
      return NextResponse.json({ ok: false, error: fbData }, { status: 500 });
    }

    return NextResponse.json({ ok: true, events_received: fbData.events_received });
  } catch (err) {
    console.error('[Meta CAPI] Unexpected error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
