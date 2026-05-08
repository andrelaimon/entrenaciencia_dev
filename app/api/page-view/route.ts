import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  if (!payload?.anonymous_id) {
    return NextResponse.json({ ok: false, error: 'missing_anonymous_id' }, { status: 400 });
  }

  // Vercel injects geo headers automatically when deployed
  const country = req.headers.get('x-vercel-ip-country') || null;

  const { error } = await supabase.from('page_views').insert({
    anonymous_id:             payload.anonymous_id,
    session_id:               payload.session_id ?? null,
    path:                     payload.path ?? null,
    referrer:                 payload.referrer || null,
    user_agent:               payload.user_agent ?? null,
    country,
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

  if (error) console.error('[page-view]', error.message);
  return NextResponse.json({ ok: !error });
}
