// One-time conversion of the prototype catalogue into a JSON seed for SQLite.
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../src/data/initialData.ts', import.meta.url), 'utf8')
  .replace(/^import .*;\s*/m, '')
  .replaceAll('export const INITIAL_', 'const INITIAL_')
  .replaceAll(/: (?:Category|Product|ProductVariant|DeliveryZone|Order)\[\]/g, '');
const result = runInNewContext(`${source}\nJSON.stringify({categories:INITIAL_CATEGORIES,products:INITIAL_PRODUCTS,variants:INITIAL_VARIANTS,zones:INITIAL_ZONES})`);
writeFileSync(new URL('./seed-data.json', import.meta.url), result);
