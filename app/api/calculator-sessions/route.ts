import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  if (!payload?.wizard_session_id) {
    return NextResponse.json({ ok: false, error: 'missing_wizard_session_id' }, { status: 400 });
  }

  const { error } = await supabase.from('calculator_sessions').insert({
    wizard_session_id:        payload.wizard_session_id,
    step_reached:             payload.step_reached ?? 'intro',
    time_on_page_seconds:     payload.time_on_page_seconds ?? null,
    email:                    payload.email || null,
    goal_selected:            payload.goal_selected || null,
    obstacle_selected:        payload.obstacle_selected || null,
    flag_medical:             payload.flag_medical ?? false,
    flag_medications:         payload.flag_medications ?? false,
    flag_weight_change:       payload.flag_weight_change ?? false,
    flag_eating_control:      payload.flag_eating_control ?? false,
    flag_pregnancy_lactation: payload.flag_pregnancy_lactation ?? false,
    flag_restrictive_diet:    payload.flag_restrictive_diet ?? false,
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

  if (error) console.error('[calculator-sessions]', error.message);
  return NextResponse.json({ ok: !error });
}
