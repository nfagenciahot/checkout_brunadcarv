import { readProjectFile } from './panelStorage';

export async function readSiteConfig() {
  const bytes = await readProjectFile('public/config.json');
  return JSON.parse(bytes.toString('utf8'));
}
