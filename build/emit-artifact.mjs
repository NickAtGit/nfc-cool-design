/* Builds the shareable single-file guideline for the Artifact host: every
   section in one page, the menu switching them in place, the one font host
   the Artifact CSP admits, and every image inlined.
   Usage: node build/emit-artifact.mjs <output.html> */
import { writeFileSync } from 'node:fs';
import { renderSingle } from './guideline.mjs';

const out = process.argv[2];
if (!out) { console.error('usage: node build/emit-artifact.mjs <output.html>'); process.exit(1); }
writeFileSync(out, renderSingle());
console.log(`wrote ${out}`);
