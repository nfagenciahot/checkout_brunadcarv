import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handleUpload } from '@vercel/blob/client';
import { PANEL_COOKIE, verifyPanelSession } from '../../../../lib/panelAuth';

const SAFE_SLOT = /^[a-zA-Z0-9_-]{1,40}$/;

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

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
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

        return {
          allowedContentTypes: allowedTypesForSlot(slot),
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
          cacheControlMaxAge: 30 * 24 * 60 * 60,
          tokenPayload: JSON.stringify({ slot }),
        };
      },
      onUploadCompleted: async () => {
        // O config.json continua sendo salvo pelo botão "Salvar alterações".
        // O upload em si já está persistido no Blob neste ponto.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
