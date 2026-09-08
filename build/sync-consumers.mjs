/* Push the built CSS into every consumer that vendors it.
   A vendored copy is a copy, and a copy drifts: business_card_service was
   1216 bytes behind the bundle on 2026-09-07 with nothing to say so. The
   manual `cp` in the guideline is what this replaces, and `npm run build`
   ends by calling it, so a change to the system reaches its consumers in the
   same breath that produced it. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const PARENT = process.env.NFCCOOL_DESIGN_CONSUMER_ROOT ?? resolve(REPO, '..');

export function plan() {
  const { consumers } = JSON.parse(readFileSync(join(REPO, 'consumers.json'), 'utf8'));
  const out = [];
  for (const [name, spec] of Object.entries(consumers)) {
    const root = isAbsolute(spec.root) ? spec.root : join(PARENT, spec.root);
    for (const [from, to] of Object.entries(spec.files)) {
      out.push({ name, src: join(REPO, from), dst: join(root, to), present: existsSync(root) });
    }
  }
  return out;
}

/* Only a file that is ALREADY vendored can be stale. A destination that does
   not exist means this checkout has not adopted the package (or has a
   different branch out), which is not drift and must not be reported as it. */
export function drift() {
  return plan()
    .filter(p => p.present && existsSync(p.dst))
    .filter(p => readFileSync(p.src, 'utf8') !== readFileSync(p.dst, 'utf8'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  // Adopting is a deliberate act by the consuming project, not something a
  // build in another repo does to it. Without --adopt this only refreshes what
  // is already vendored, so running a build can never scatter a design bundle
  // into a checkout that does not use one.
  const adopt = process.argv.includes('--adopt');
  const items = plan();
  let wrote = 0, skipped = 0;
  for (const p of items) {
    if (!p.present) { console.log(`skip  ${p.name} (not on this machine)`); skipped++; continue; }
    const body = readFileSync(p.src, 'utf8');
    if (!existsSync(p.dst)) {
      if (!adopt) {
        console.log(`skip  ${p.dst} (not vendored here; --adopt to start)`);
        skipped++; continue;
      }
      mkdirSync(dirname(p.dst), { recursive: true });
    }
    if (existsSync(p.dst) && readFileSync(p.dst, 'utf8') === body) { console.log(`ok    ${p.dst}`); continue; }
    if (check) { console.error(`STALE ${p.dst}`); wrote++; continue; }
    writeFileSync(p.dst, body);
    console.log(`wrote ${p.dst} (${body.length} bytes)`);
    wrote++;
  }
  if (check && wrote) {
    console.error(`\n${wrote} vendored file(s) behind the bundle. Run: npm run sync`);
    process.exit(1);
  }
  console.log(check ? 'consumers up to date' : `synced ${wrote} file(s), skipped ${skipped}`);
}
