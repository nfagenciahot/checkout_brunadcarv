import { get } from '@vercel/blob';
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

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') || undefined,
    });

    if (!result) return new NextResponse('Mídia não encontrada.', { status: 404 });

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }

    if (result.statusCode !== 200 || !result.stream) {
      return new NextResponse('Mídia não encontrada.', { status: 404 });
    }

    const headers = new Headers({
      'Content-Type': result.blob.contentType || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      ETag: result.blob.etag,
      'Cache-Control': 'public, max-age=86400, immutable',
    });

    if (Number.isFinite(result.blob.size)) {
      headers.set('Content-Length', String(result.blob.size));
    }

    return new NextResponse(result.stream, { status: 200, headers });
  } catch (error) {
    console.error('[Blob media]', error);
    return new NextResponse('Falha ao carregar mídia.', { status: 500 });
  }
}
