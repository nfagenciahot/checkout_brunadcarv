import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';

function safePath(parts) {
  if (!Array.isArray(parts) || !parts.length) return '';
  const decoded = parts.map((part) => decodeURIComponent(String(part || '')));
  if (decoded.some((part) => !part || part === '.' || part === '..' || part.includes('\\'))) return '';
  const pathname = decoded.join('/');
  if (!pathname.startsWith('panel-media/')) return '';
  return pathname;
}

export async function GET(request, { params }) {
  try {
    const resolved = await params;
    const pathname = safePath(resolved?.pathname);
    if (!pathname) return new NextResponse('Mídia inválida.', { status: 400 });

    const validUntil = Date.now() + 60 * 60 * 1000;

    const token = await issueSignedToken({
      pathname,
      operations: ['get'],
      validUntil,
    });

    const { presignedUrl } = await presignUrl(token, {
      pathname,
      operation: 'get',
      access: 'private',
      validUntil,
    });

    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: presignedUrl,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Blob media redirect]', error);
    return new NextResponse('Falha ao carregar mídia.', { status: 500 });
  }
}
