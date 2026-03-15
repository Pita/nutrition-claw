import { readFoods, writeFoods } from '../lib/storage.ts';
import { print, err } from '../lib/format.ts';
import { upsertVector, deleteVector, searchVectors, foodVecId } from '../lib/vectors.ts';
import type { FoodEntry, Unit } from '../lib/types.ts';
import { WEIGHT_UNITS, VOLUME_UNITS } from '../lib/types.ts';

type Args = Record<string, string | boolean | undefined>;

const ALL_UNITS = [...WEIGHT_UNITS, ...VOLUME_UNITS];
const NUTRIENT_FLAGS = ['calories_kcal', 'protein_g', 'carbs_g', 'fiber_g', 'sugar_g', 'fat_g', 'sat_fat_g'] as const;

function extractNutrients(args: Args): Partial<FoodEntry> {
  const entry: Partial<FoodEntry> = {};
  for (const key of NUTRIENT_FLAGS) {
    const flag = key.replace(/_/g, '-');
    const val = args[flag] ?? args[key];
    if (val !== undefined && val !== true) {
      (entry as Record<string, number>)[key] = Number(val);
    }
  }
  return entry;
}

export async function foodCommand(sub: string, args: Args, positional: string[]): Promise<void> {
  switch (sub) {
    case 'add':    return foodAdd(args);
    case 'get':    return foodGet(positional[0]);
    case 'list':   return foodList();
    case 'update': return foodUpdate(positional[0], args);
    case 'delete': return foodDelete(positional[0]);
    case 'search': return foodSearch(positional[0]);
    default:
      err(`unknown food subcommand: ${sub}. Use add | get | list | update | delete | search`);
      process.exit(1);
  }
}

async function foodAdd(args: Args): Promise<void> {
  const name = args['name'] as string | undefined;
  if (!name) { err('--name is required'); process.exit(1); }

  const per_amount = Number(args['per-amount'] ?? args['per_amount'] ?? 100);
  const per_unit   = (args['per-unit'] ?? args['per_unit'] ?? 'g') as Unit;

  if (!ALL_UNITS.includes(per_unit)) {
    err(`invalid unit: ${per_unit}. Valid: ${ALL_UNITS.join(', ')}`);
    process.exit(1);
  }

  const nutrients = extractNutrients(args);
  const entry: FoodEntry = { per_amount, per_unit, ...nutrients };

  const foods = readFoods();
  foods[name] = entry;
  writeFoods(foods);

  await upsertVector(foodVecId(name), name, { type: 'food', name });
  print({ name, ...entry });
}

function foodGet(name: string | undefined): void {
  if (!name) { err('food name required'); process.exit(1); }
  const foods = readFoods();
  if (!foods[name]) { err(`food not found: ${name}`); process.exit(1); }
  print({ name, ...foods[name] });
}

function foodList(): void {
  const foods = readFoods();
  const entries = Object.entries(foods).map(([name, entry]) => ({ name, ...entry }));
  print({ foods: entries });
}

async function foodUpdate(name: string | undefined, args: Args): Promise<void> {
  if (!name) { err('food name required'); process.exit(1); }
  const foods = readFoods();
  if (!foods[name]) { err(`food not found: ${name}`); process.exit(1); }

  const nutrients = extractNutrients(args);
  if (args['per-amount'] ?? args['per_amount']) {
    foods[name].per_amount = Number(args['per-amount'] ?? args['per_amount']);
  }
  if (args['per-unit'] ?? args['per_unit']) {
    const u = (args['per-unit'] ?? args['per_unit']) as Unit;
    if (!ALL_UNITS.includes(u)) { err(`invalid unit: ${u}`); process.exit(1); }
    foods[name].per_unit = u;
  }
  Object.assign(foods[name], nutrients);
  writeFoods(foods);
  print({ name, ...foods[name] });
}

async function foodDelete(name: string | undefined): Promise<void> {
  if (!name) { err('food name required'); process.exit(1); }
  const foods = readFoods();
  if (!foods[name]) { err(`food not found: ${name}`); process.exit(1); }
  delete foods[name];
  writeFoods(foods);
  await deleteVector(foodVecId(name));
  print({ deleted: name });
}

async function foodSearch(query: string | undefined): Promise<void> {
  if (!query) { err('search query required'); process.exit(1); }
  const results = await searchVectors(query, 5, 'food');
  const foods = readFoods();
  const items = results.map(r => {
    const meta = r.metadata as { type: 'food'; name: string };
    const entry = foods[meta.name];
    return entry ? { name: meta.name, score: Math.round(r.score * 100) / 100, ...entry } : null;
  }).filter(Boolean);
  print({ query, results: items });
}
