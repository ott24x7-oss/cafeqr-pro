import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, app: 'CafeQR Pro', time: new Date().toISOString() });
}
