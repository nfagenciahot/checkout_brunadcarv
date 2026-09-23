import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { issueSignedToken } from '@vercel/blob';
import { handleUploadPresigned } from '@vercel/blob/client';
import { PANEL_COOKIE, verifyPanelSession } from '../../../../lib/panelAuth';

const SAFE_SLOT = /^[a-zA-Z0-9_-]{1,40}$/;
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

function allowedTypesForSlot(slot) {
  if (slot === 'welcome-audio') return ['audio/*'];
  if (/^postagem[1-3]$/.test(slot)) return ['image/*', 'video/*'];
  if (/^bump-[12]$/.test(slot)) return ['image/*', 'video/*'];
  return ['image/*'];
}

async function panelAuthorized() {
  const store = await cookies();
  return !!verifyPanelSession(store.get(PANEL_COOKIE)?.value);
}

export async function POST(request) {
  try {
    const body = await request.json();

    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname, clientPayload) => {
        if (!(await panelAuthorized())) {
          throw new Error('Não autorizado. Faça login novamente no /panel.');
        }

        let payload = {};
        try {
          payload = JSON.parse(clientPayload || '{}');
        } catch {
          throw new Error('Dados do upload inválidos.');
        }

        const slot = String(payload.slot || '');
        if (!SAFE_SLOT.test(slot)) throw new Error('Slot inválido.');

        const expectedPrefix = `panel-media/${slot}/`;
        if (!String(pathname || '').startsWith(expectedPrefix)) {
          throw new Error('Destino de upload inválido.');
        }

        const token = await issueSignedToken({
          pathname,
          operations: ['put'],
          allowedContentTypes: allowedTypesForSlot(slot),
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          validUntil: Date.now() + 15 * 60 * 1000,
        });

        return {
          token,
          urlOptions: {
            access: 'public',
            addRandomSuffix: true,
            allowOverwrite: false,
            cacheControlMaxAge: 30 * 24 * 60 * 60,
            tokenPayload: JSON.stringify({ slot }),
          },
        };
      },
      onUploadCompleted: async () => {
        // A mídia já está persistida no Blob.
        // O config.json continua sendo publicado pelo botão "Salvar alterações".
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('[Panel Blob presigned upload]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
