import { NextResponse } from 'next/server';

const PDF_URL = `${process.env.SUPABASE_URL}/storage/v1/object/public/guides/Entrena%20con%20Ciencia%20-%20Guia%20Proteina.pdf`;

export function GET() {
  return NextResponse.redirect(PDF_URL, 301);
}
