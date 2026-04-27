import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { name, email, whatsapp, source, survey } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const { error } = await supabase
    .from('leads')
    .insert({ name: name ?? null, email, whatsapp: whatsapp ?? null, source: source ?? null, survey: survey ?? null });

  if (error) {
    console.error('Supabase insert error:', error.message);
    return NextResponse.json({ error: 'No se pudo guardar los datos' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
