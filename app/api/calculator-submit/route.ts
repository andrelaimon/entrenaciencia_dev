import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function calorieBracket(cal: number): string {
  if (cal < 1500) return '<1500';
  if (cal < 2000) return '1500-2000';
  if (cal < 2500) return '2000-2500';
  return '2500+';
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);

  if (
    !payload ||
    typeof payload.email !== 'string' ||
    typeof payload.name !== 'string' ||
    !payload.email.trim() ||
    !payload.name.trim()
  ) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const { inputs, result, obstacle, name, email, flags } = payload;

  const tracking = {
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
  };

  const [submissionResult, leadResult] = await Promise.all([
    supabase.from('calculator_submissions').insert({
      name,
      email,
      units:                    inputs?.units ?? null,
      sex:                      inputs?.sex ?? null,
      age:                      inputs?.age ?? null,
      weight_kg:                inputs?.weight ?? null,
      height_cm:                inputs?.height ?? null,
      body_fat_pct:             inputs?.bodyFat ?? null,
      activity_level:           inputs?.activity ?? null,
      goal:                     inputs?.goal ?? null,
      bmr:                      result?.bmr ?? null,
      tdee:                     result?.tdee ?? null,
      calories:                 result?.calories ?? null,
      calorie_bracket:          result?.calories ? calorieBracket(result.calories) : null,
      protein_g:                result?.protein ?? null,
      carbs_g:                  result?.carbs ?? null,
      fat_g:                    result?.fat ?? null,
      obstacle:                 obstacle ?? null,
      flag_medical:             flags?.medical ?? false,
      flag_medications:         flags?.medications ?? false,
      flag_weight_change:       flags?.weightChange ?? false,
      flag_eating_control:      flags?.eatingControl ?? false,
      flag_pregnancy_lactation: flags?.pregnancyLactation ?? false,
      flag_restrictive_diet:    flags?.restrictiveDiet ?? false,
      disclaimer_accepted:      flags?.disclaimerAccepted ?? false,
      ...tracking,
    }),

    supabase.from('leads').insert({
      name,
      email,
      whatsapp:  null,
      source:    'Calculadora',
      ...tracking,
    }),
  ]);

  if (submissionResult.error) console.error('[calculator-submit] submission:', submissionResult.error.message);
  if (leadResult.error) console.error('[calculator-submit] lead:', leadResult.error.message);

  if (submissionResult.error && leadResult.error) {
    return NextResponse.json({ ok: false, error: 'database_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
