// Vice Cover Studio — entrypoint for gta6-cover-art-01.
//
// Copies app/ and screenshots/ from this repository into the output
// directory and writes dossier.json exactly as buildDossier produces it
// from those copied files. Standard library only, no network, deterministic:
// two runs over the same repository write the same bytes.

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const name of ['app', 'screenshots']) {
  cpSync(join(repoRoot, name), join(outDir, name), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);

const shotCount = readdirSync(join(outDir, 'screenshots')).length;
console.log(
  `vice-cover-studio: wrote ${outDir} — app/ + screenshots/ copied, ` +
  `dossier.json ${dossier.byteLength} bytes, ${shotCount} screenshot(s)`,
);
