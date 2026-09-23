import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    OMEGAPAY_DOCUMENT: process.env.OMEGAPAY_DOCUMENT ? `SET (${process.env.OMEGAPAY_DOCUMENT.length} chars)` : 'NOT SET',
    OMEGAPAY_PUBLIC_KEY: process.env.OMEGAPAY_PUBLIC_KEY ? `SET (${process.env.OMEGAPAY_PUBLIC_KEY.length} chars)` : 'NOT SET',
    OMEGAPAY_SECRET_KEY: process.env.OMEGAPAY_SECRET_KEY ? `SET (${process.env.OMEGAPAY_SECRET_KEY.length} chars)` : 'NOT SET',
    SITE_URL: process.env.SITE_URL || 'NOT SET',
    REDIS_URL: process.env.REDIS_URL ? 'SET' : 'NOT SET',
  });
}
