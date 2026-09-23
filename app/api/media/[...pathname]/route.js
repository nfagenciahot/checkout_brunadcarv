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

    // Retorna a mídia fazendo streaming direto para suportar range requests (vídeos)
    const rangeHeader = request.headers.get('range');
    const upstreamHeaders = {};
    if (rangeHeader) upstreamHeaders['Range'] = rangeHeader;

    const upstream = await fetch(presignedUrl, { headers: upstreamHeaders });

    const responseHeaders = new Headers();
    ['content-type', 'content-length', 'content-range', 'last-modified', 'etag'].forEach((h) => {
      const v = upstream.headers.get(h);
      if (v) responseHeaders.set(h, v);
    });
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'private, max-age=300');

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[Blob media proxy]', error);
    return new NextResponse('Falha ao carregar mídia.', { status: 500 });
  }
}
