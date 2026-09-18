import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
mkdirSync('test-results', { recursive: true });
