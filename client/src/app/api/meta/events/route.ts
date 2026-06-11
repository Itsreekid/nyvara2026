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
      event_name,      // Required: The standard event name
      event_id,        // Required: Must match the client-side pixel event_id
      event_source_url,
      order_id,
      value,
      email,
      phone,
      first_name,
      last_name,
      city,
      country,
      content_ids,    // array of product IDs
      contents,
      num_items,
      currency = 'TND',
      content_category,
    } = body;

    // Build user data — hash all PII, send IP and UA raw
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

    const normalizedContents = Array.isArray(contents)
      ? contents.map((item: { id?: string; quantity?: number; item_price?: number }) => ({
          id:         String(item.id ?? ''),
          quantity:   Number(item.quantity ?? 1),
          item_price: Number(item.item_price ?? 0),
        }))
      : [];

    const customData: Record<string, any> = {};
    if (value !== undefined) customData.value = value;
    if (currency) customData.currency = currency;
    if (order_id) customData.order_id = order_id;
    if (content_ids && content_ids.length > 0) customData.content_ids = content_ids;
    if (normalizedContents.length > 0) customData.contents = normalizedContents;
    if (num_items !== undefined) customData.num_items = num_items;
    customData.content_type = 'product';
    if (content_category) customData.content_category = content_category;

    const payload = {
      data: [
        {
          event_name: event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,          // deduplication key
          event_source_url:  event_source_url || (req.headers.get('referer') ?? 'https://nyvara.net'),
          action_source:     'website',
          user_data:         userData,
          custom_data:       customData,
        },
      ],
      ...(process.env.META_TEST_EVENT_CODE
        ? { test_event_code: process.env.META_TEST_EVENT_CODE }
        : {}),
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
