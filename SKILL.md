# nutrition-claw

A fully local, offline-first nutrition tracking CLI built for [openclaw](https://openclaw.ai). Track daily meals and ingredients, manage a personal food library, set nutrition goals, and search your history — all without sending data anywhere.

## Installation

Published to GitHub Packages. Install globally:

```bash
npm install -g @pita/nutrition-claw --registry=https://npm.pkg.github.com
```

Or configure npm once so the `@pita` scope always resolves from GitHub Packages:

```bash
echo "@pita:registry=https://npm.pkg.github.com" >> ~/.npmrc
npm install -g @pita/nutrition-claw
```

Then run the setup wizard once to set nutrition goals:

```bash
nutrition-claw configure
```

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

Store nutrition data per reference amount (e.g. per 100g, per 100ml, per 1 tbsp). Values are scaled automatically when added to a meal. Intended workflow: user shares a photo of a nutrition label → extract values → `food add`. Next time they eat it, use `food search` to find it and `meal ingredient add --food` to auto-scale.

```bash
nutrition-claw food add --name "chicken breast" --per-amount 100 --per-unit g \
  --calories-kcal 165 --protein-g 31 --fat-g 3.6

nutrition-claw food add --name "whole milk" --per-amount 100 --per-unit ml \
  --calories-kcal 61 --protein-g 3.2 --fat-g 3.3

nutrition-claw food add --name "olive oil" --per-amount 1 --per-unit tbsp \
  --calories-kcal 119 --fat-g 13.5

nutrition-claw food list
nutrition-claw food get "chicken breast"      # exact name
nutrition-claw food search "chicken"          # semantic — no exact name needed
nutrition-claw food update "chicken breast" --protein-g 32
nutrition-claw food delete "chicken breast"
```

Supported units — WEIGHT: `g` `kg` `oz` `lb` · VOLUME: `ml` `L` `fl_oz` `cup` `tbsp` `tsp`

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
