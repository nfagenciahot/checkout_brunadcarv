import path from 'path';

function githubSettings() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = process.env.GITHUB_BRANCH?.trim() || 'main';

  if (!token) {
    throw new Error('GITHUB_TOKEN não configurado na Vercel.');
  }

  if (!owner) {
    throw new Error('GITHUB_OWNER não configurado na Vercel.');
  }

  if (!repo) {
    throw new Error('GITHUB_REPO não configurado na Vercel.');
  }

  return {
    token,
    owner,
    repo,
    branch,
  };
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function githubRead(relPath) {
  const cfg = githubSettings();

  const url =
    `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/` +
    `${encodeURI(relPath)}?ref=${encodeURIComponent(cfg.branch)}`;

  const res = await fetch(url, {
    headers: headers(cfg.token),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text();

    throw new Error(
      `GitHub GET ${relPath}: ${res.status} ${detail.slice(0, 300)}`
    );
  }

  const data = await res.json();

  return Buffer.from(data.content || '', 'base64');
}

async function githubWrite(
  relPath,
  bytes,
  message = 'Atualização pelo painel'
) {
  const cfg = githubSettings();

  const url =
    `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/` +
    encodeURI(relPath);

  let sha;

  const existing = await fetch(
    `${url}?ref=${encodeURIComponent(cfg.branch)}`,
    {
      headers: headers(cfg.token),
      cache: 'no-store',
    }
  );

  if (existing.ok) {
    const current = await existing.json();
    sha = current.sha;
  }

  const body = {
    message,
    content: Buffer.from(bytes).toString('base64'),
    branch: cfg.branch,
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers: headers(cfg.token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();

    throw new Error(
      `GitHub PUT ${relPath}: ${res.status} ${detail.slice(0, 300)}`
    );
  }

  return res.json();
}

async function githubDelete(
  relPath,
  message = 'Remover arquivo pelo painel'
) {
  const cfg = githubSettings();

  const url =
    `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/` +
    encodeURI(relPath);

  const existing = await fetch(
    `${url}?ref=${encodeURIComponent(cfg.branch)}`,
    {
      headers: headers(cfg.token),
      cache: 'no-store',
    }
  );

  if (!existing.ok) {
    return false;
  }

  const current = await existing.json();

  const res = await fetch(url, {
    method: 'DELETE',
    headers: headers(cfg.token),
    body: JSON.stringify({
      message,
      sha: current.sha,
      branch: cfg.branch,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();

    throw new Error(
      `GitHub DELETE ${relPath}: ${res.status} ${detail.slice(0, 300)}`
    );
  }

  return true;
}

function backupRelPath(relPath) {
  const ext = path.extname(relPath);

  return ext
    ? `${relPath.slice(0, -ext.length)}_backup${ext}`
    : `${relPath}_backup`;
}

export async function backupProjectFile(
  relPath,
  message = 'Painel: criar backup'
) {
  if (!relPath) {
    return {
      backedUp: false,
    };
  }

  const backupPath = backupRelPath(relPath);

  try {
    const bytes = await githubRead(relPath);

    await githubWrite(
      backupPath,
      bytes,
      message
    );

    await githubDelete(
      relPath,
      `${message} (renomear original)`
    );

    return {
      backedUp: true,
      backupPath,
      mode: 'github',
    };
  } catch (error) {
    if (
      String(error.message).includes('GitHub GET') &&
      String(error.message).includes('404')
    ) {
      return {
        backedUp: false,
        mode: 'github',
      };
    }

    throw error;
  }
}

export function storageMode() {
  return 'github';
}

export async function readProjectFile(relPath) {
  return githubRead(relPath);
}

export async function writeProjectFile(
  relPath,
  bytes,
  message = 'Atualização pelo painel'
) {
  await githubWrite(
    relPath,
    bytes,
    message
  );

  return {
    mode: 'github',
    redeployRequired: true,
  };
}
