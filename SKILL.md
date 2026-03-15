# nutrition-claw

A fully local, offline-first nutrition tracking CLI built for [openclaw](https://openclaw.ai). Track daily meals and ingredients, manage a personal food library, set nutrition goals, and search your history — all without sending data anywhere.

## Setup

The skill folder ships with pre-built JS in `dist/` but **not** `node_modules` — native dependencies (ONNX runtime for local embeddings) must be installed locally.

**1. Install dependencies**

```bash
cd <skill-folder>
npm install
```

**2. Build**

The `dist/` folder ships pre-built, but run this to recompile from source if needed (requires [Bun](https://bun.sh)):

```bash
npm run build
```

**3. Make the CLI available**

```bash
npm link
```

This creates a global `nutrition-claw` symlink so you can call it from anywhere.

**3. First-time goal setup**

```bash
nutrition-claw configure
```

Run the interactive wizard (no flags) or pass flags directly — see the `configure` command below.

> To unlink later: `npm unlink -g @pita/nutrition-claw`

## Overview

- All data (meals, foods, goals) is stored in `~/.nutrition-claw/` as plain JSON files — fully local, never uploaded
- Semantic search uses a local MiniLM embedding model (no API key; model downloads once on first search, then cached)
- Output is YAML — compact, human-readable, easy to parse
- Dates (`YYYY-MM-DD`) and times (`HH:MM`) must always be passed explicitly — the CLI never infers them
- Errors are written to stderr; structured data to stdout

---

## Command Reference

### `configure` — set nutrition goals

Two modes: interactive (no flags) guides through a wizard; non-interactive (flags provided) outputs YAML directly, no prompts.

```bash
# Auto mode — compute goals from body profile (Mifflin-St Jeor BMR + TDEE)
nutrition-claw configure \
  --sex male|female|other \
  --age <n> \
  --weight-kg <n> \
  --height-cm <n> \
  --activity sedentary|light|moderate|very|extra \
  --goal lose|recomp|maintain|lean-bulk|bulk \
  --rate 0.25|0.5|0.75        # kg/week loss (only for --goal lose)
  --surplus 200|350|500        # kcal surplus (only for --goal bulk)

# Manual mode — set each nutrient directly
nutrition-claw configure --calories-kcal 2000 --protein-g 150 --carbs-g 250 \
  --fiber-g 25 --sugar-g 50 --fat-g 65 --sat-fat-g 20
```

---

### `goals` — daily nutrition targets

Directions are fixed: `calories_kcal`, `carbs_g`, `sugar_g`, `fat_g`, `sat_fat_g` are **max** (upper limits); `protein_g`, `fiber_g` are **min** (targets to reach).

```bash
nutrition-claw goals get
nutrition-claw goals set --calories-kcal 2200 --protein-g 160
nutrition-claw goals delete --nutrient protein_g   # remove one
nutrition-claw goals delete                        # remove all
```

---

### `food` — reusable food library

The food library is **only for packaged/labelled products** (things with a nutrition label). Always store values per **100g or 100ml** as printed on the label — `--per-amount` defaults to 100 so you can omit it. Values are scaled automatically when added to a meal.

Intended workflow: user shares a photo of a nutrition label → extract values per 100g/100ml → `food add`. Next time they eat it, use `food search` to find it and `meal ingredient add --food` to auto-scale.

**Do NOT use the food library for:**
- Home-cooked meals or restaurant dishes (log those as manual meal ingredients instead)
- Single-serving estimates for non-packaged foods

```bash
# Per 100g (default — --per-amount and --per-unit can be omitted)
nutrition-claw food add --name "Staropramen Lager" \
  --calories-kcal 43 --protein-g 0.4 --carbs-g 3.6 --fat-g 0

# Explicit per 100ml (same as default but verbose)
nutrition-claw food add --name "whole milk" --per-amount 100 --per-unit ml \
  --calories-kcal 61 --protein-g 3.2 --fat-g 3.3

nutrition-claw food list
nutrition-claw food get "Staropramen Lager"   # exact name
nutrition-claw food search "beer"             # semantic — no exact name needed
nutrition-claw food update "whole milk" --protein-g 3.4
nutrition-claw food delete "whole milk"
```

Supported units — WEIGHT: `g` `kg` `oz` `lb` · VOLUME: `ml` `L` `fl_oz` `cup` `tbsp` `tsp`

#### Nutritional education on `food add`

Every `food add` returns an `education` array alongside the stored entry. Each element is a plain-English insight about the food relative to the user's goals (protein density, calorie density, saturated fat, sugar, fiber, healthy fat ratio). This field is **only present the first time** a food is added — subsequent `food add` or `food update` calls for the same name omit it entirely, so the user is never lectured twice.

**Always surface education insights conversationally** — don't just list them verbatim. Example:
- "Worth knowing: this is pretty calorie-dense at 320 kcal/100ml, so a standard 500ml pour is already ~160 kcal."
- "Good news — it's mostly unsaturated fat, so it's the healthier kind."

If the `education` field is absent (food already seen before), say nothing extra about its nutrition profile. If it's an empty array, the food has no notable highlights relative to the current goals — skip the education comment.

Education history is stored in `~/.nutrition-claw/education.txt` — a plain text file, one food name per line, capped at 20 lines. When full, the oldest entry is dropped (FIFO rotation), so foods cycle back into education eligibility over time. This keeps the file tiny and avoids permanent suppression.

---

### `meal` — log daily meals and ingredients

`--date` and `--time` are always required for `meal add`. Meal nutrition totals are computed from their ingredients — never stored separately.

```bash
# Create a meal — returns the meal id
nutrition-claw meal add --name "Lunch" --date 2026-03-15 --time 13:00
# id: D-lfLPOP

# List meals for a day (includes per-ingredient breakdown and meal totals)
nutrition-claw meal list --date 2026-03-15

# Rename or delete a meal
nutrition-claw meal update D-lfLPOP --name "Dinner"
nutrition-claw meal delete D-lfLPOP
```

#### Ingredients

```bash
# Manual — specify nutrients directly
nutrition-claw meal ingredient add D-lfLPOP \
  --name "Chicken breast" --calories-kcal 165 --protein-g 31 --fat-g 3.6

# From food library — auto-scales by amount and unit
nutrition-claw meal ingredient add D-lfLPOP --food "chicken" --amount 200 --unit g
# matched: chicken breast  (nearest semantic match, scaled to 200g)

# Update ingredient by index
nutrition-claw meal ingredient update D-lfLPOP 0 --calories-kcal 170

# Delete ingredient by index
nutrition-claw meal ingredient delete D-lfLPOP 0
```

#### Ingredient impact feedback

Every `meal ingredient add` and `meal ingredient update` returns an `impact` block showing, per nutrient: how much this ingredient contributed (`added`), the running daily `total`, `goal`, `remaining` headroom or deficit, `pct` of goal consumed (100.0 = goal exactly met), and `status` (`ok` / `under` / `over`).

**Always interpret this and give the user explicit, opinionated feedback.** Examples:
- "Great — chicken pushes protein to 15% of goal with only 6.6% of calories used."
- "Heads up: this brings saturated fat to 94% of your daily limit."
- "You're now over your calorie goal for the day (112%)."
- "Protein is still well under target (15%) — consider a protein-rich addition."

Point out both wins and overages. Be specific with numbers. Synthesise into 1–2 sentences of nutritional coaching — don't just echo the YAML.

#### Educational nutrition insights (agent only)

When logging ingredients, you may occasionally share a brief educational insight about a food's nutritional properties — e.g. that salmon is rich in omega-3, or that white rice spikes blood sugar faster than brown rice. These insights should feel natural, not lecture-y.

**To avoid repeating the same insight constantly**, track what has been shared in `~/.openclaw/workspace/memory/nutrition-insights.json`:

```json
{
  "salmon omega-3": "2026-03-15",
  "white rice glycemic": "2026-03-10"
}
```

Rules:
- Before sharing an insight, check if a matching key already exists in that file and was shared **within the last 7 days**. If so, skip it.
- After sharing an insight, write (or update) the key with today's ISO date (`YYYY-MM-DD`).
- Entries older than 7 days are considered expired — you may share the insight again and update the date.
- Keep keys short and descriptive (food + topic). The file is read and written directly; create it if it doesn't exist.
- Don't share more than one insight per ingredient addition — keep it light.

---

### `summary` — daily totals vs goals

```bash
nutrition-claw summary --date 2026-03-15
# per-nutrient: consumed / goal / pct / status (ok | under | over)
```

---

### `history` — multi-day overview

```bash
nutrition-claw history --from 2026-03-01 --to 2026-03-15
nutrition-claw history --from 2026-03-15 --days 7
```

---

### `search` — semantic search (no exact name needed)

Three domain-specific searches — results scoped to the right data type:

```bash
nutrition-claw meal search "pasta"
nutrition-claw meal search "pasta" --from 2026-03-01 --to 2026-03-15

nutrition-claw meal ingredient search "chicken"
nutrition-claw meal ingredient search "chicken" --from 2026-03-10

nutrition-claw food search "beef"
```

---

## Nutrients

| Flag | Unit | Direction |
|---|---|---|
| `--calories-kcal` | kcal | max |
| `--protein-g` | g | min |
| `--carbs-g` | g | max |
| `--fiber-g` | g | min |
| `--sugar-g` | g | max |
| `--fat-g` | g | max |
| `--sat-fat-g` | g | max |

## Data location

```
~/.nutrition-claw/
  goals.json       # daily nutrition goals
  foods.json       # food library
  logs/            # YYYY-MM-DD.json per day
  vectors/         # local MiniLM vector index
```
