import { NextResponse } from 'next/server';

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

  // TODO(klaviyo): forward { email, name, klaviyoProps, result } to Klaviyo
  //   - Subscribe `email` to the calculator list
  //   - Set contact properties: obstacle, restrictive_diet, goal, tdee, calories
  //   - Trigger the obstacle-mapped email flow:
  //       what_to_eat   -> Email A (food table)
  //       consistency   -> Email B (3-step plan)
  //       no_time       -> Email C (quick meal prep)
  //       health        -> Email D (Dr. León note)
  //       other         -> Email E (generic)
  console.log('[calculator-submit]', {
    email: payload.email,
    name: payload.name,
    obstacle: payload.obstacle,
    restrictive_diet: payload.klaviyoProps?.restrictive_diet,
    calories: payload.result?.calories,
    tdee: payload.result?.tdee,
    goal: payload.inputs?.goal,
  });

  return NextResponse.json({ ok: true });
}
