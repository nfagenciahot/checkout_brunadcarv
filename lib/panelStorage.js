import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();

function githubSettings() {
  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = process.env.GITHUB_BRANCH?.trim() || 'main';
  if (!token || !owner || !repo) return null;
  return { token, owner, repo, branch };
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
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(relPath)}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, { headers: headers(cfg.token), cache: 'no-store' });
  if (!res.ok) throw new Error(`GitHub GET ${relPath}: ${res.status}`);
  const data = await res.json();
  return Buffer.from(data.content || '', 'base64');
}

async function githubWrite(relPath, bytes, message) {
  const cfg = githubSettings();
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(relPath)}`;
  let sha;
  const existing = await fetch(`${url}?ref=${encodeURIComponent(cfg.branch)}`, { headers: headers(cfg.token), cache: 'no-store' });
  if (existing.ok) sha = (await existing.json()).sha;
  const body = {
    message,
    content: Buffer.from(bytes).toString('base64'),
    branch: cfg.branch,
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(url, { method: 'PUT', headers: headers(cfg.token), body: JSON.stringify(body) });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub PUT ${relPath}: ${res.status} ${detail.slice(0, 300)}`);
  }
  return await res.json();
}


async function githubDelete(relPath, message) {
  const cfg = githubSettings();
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(relPath)}`;
  const existing = await fetch(`${url}?ref=${encodeURIComponent(cfg.branch)}`, { headers: headers(cfg.token), cache: 'no-store' });
  if (!existing.ok) return false;
  const sha = (await existing.json()).sha;
  const res = await fetch(url, { method: 'DELETE', headers: headers(cfg.token), body: JSON.stringify({ message, sha, branch: cfg.branch }) });
  if (!res.ok) throw new Error(`GitHub DELETE ${relPath}: ${res.status}`);
  return true;
}
function backupRelPath(relPath) {
  const ext = path.extname(relPath);
  return ext ? `${relPath.slice(0,-ext.length)}_backup${ext}` : `${relPath}_backup`;
}
export async function backupProjectFile(relPath, message='Painel: criar backup') {
  if (!relPath) return { backedUp:false };
  const backupPath=backupRelPath(relPath);
  if (githubSettings()) {
    try {
      const bytes=await githubRead(relPath);
      await githubWrite(backupPath, bytes, message);
      await githubDelete(relPath, `${message} (renomear original)`);
      return { backedUp:true, backupPath, mode:'github' };
    } catch (error) {
      if(String(error.message).includes('GitHub GET') && String(error.message).includes('404')) return { backedUp:false, mode:'github' };
      throw error;
    }
  }
  const full=path.join(root,relPath); const backup=path.join(root,backupPath);
  try {
    await fs.access(full);
  } catch { return { backedUp:false, mode:'local' }; }
  await fs.mkdir(path.dirname(backup),{recursive:true});
  try { await fs.rm(backup,{force:true}); } catch {}
  await fs.rename(full,backup);
  return { backedUp:true, backupPath, mode:'local' };
}

export function storageMode() {
  return githubSettings() ? 'github' : 'local';
}

export async function readProjectFile(relPath) {
  if (githubSettings()) return githubRead(relPath);
  return fs.readFile(path.join(root, relPath));
}

export async function writeProjectFile(relPath, bytes, message = 'Atualização pelo painel') {
  if (githubSettings()) {
    await githubWrite(relPath, bytes, message);
    return { mode: 'github', redeployRequired: true };
  }
  if (process.env.VERCEL) {
    throw new Error('Na Vercel, configure GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO para salvar alterações permanentemente.');
  }
  const full = path.join(root, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes);
  return { mode: 'local', redeployRequired: false };
}
