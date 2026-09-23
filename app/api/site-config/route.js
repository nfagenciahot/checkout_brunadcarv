import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configPath = join(process.cwd(), 'public', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[site-config]', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar a configuração do site.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
