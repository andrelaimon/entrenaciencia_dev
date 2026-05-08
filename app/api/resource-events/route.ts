import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  if (!payload?.event_type || !payload?.resource_title) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const { error } = await supabase.from('resource_events').insert({
    event_type:               payload.event_type,
    resource_title:           payload.resource_title,
    resource_kind:            payload.resource_kind ?? null,
    name:                     payload.name ?? null,
    email:                    payload.email ?? null,
    anonymous_id:             payload.anonymous_id ?? null,
    session_id:               payload.session_id ?? null,
    utm_source:               payload.utm_source ?? null,
    utm_medium:               payload.utm_medium ?? null,
    utm_campaign:             payload.utm_campaign ?? null,
    utm_content:              payload.utm_content ?? null,
    utm_term:                 payload.utm_term ?? null,
    first_touch_utm_source:   payload.first_touch_utm_source ?? null,
    first_touch_utm_medium:   payload.first_touch_utm_medium ?? null,
    first_touch_utm_campaign: payload.first_touch_utm_campaign ?? null,
    first_touch_utm_content:  payload.first_touch_utm_content ?? null,
    first_touch_utm_term:     payload.first_touch_utm_term ?? null,
  });

  if (error) console.error('[resource-events]', error.message);
  return NextResponse.json({ ok: !error });
}
