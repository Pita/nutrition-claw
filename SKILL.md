# nutrition-claw

A fully local nutrition tracking CLI. Run `nutrition-claw --help` for the complete command reference.

## Overview

All data (meals, foods, goals) is stored in `~/.nutrition-claw/` as plain JSON files. Semantic search uses a local MiniLM model — nothing ever leaves your machine. No API keys, no network required (model downloads once on first search, then cached).

Output is YAML. Unset nutrient fields are omitted. Dates (`YYYY-MM-DD`) and times (`HH:MM`) are always provided explicitly — never inferred by the CLI.

## configure

Sets nutrition goals. Two modes:

**Non-interactive** (agent-friendly, no prompts, outputs YAML):

```bash
# Automatic — computed from body profile
nutrition-claw configure --sex male --age 30 --weight-kg 80 --height-cm 180 --activity moderate --goal lose --rate 0.5

# Manual — set each nutrient directly
nutrition-claw configure --calories-kcal 2000 --protein-g 150 --carbs-g 250 --fiber-g 25 --sugar-g 50 --fat-g 65 --sat-fat-g 20
```

**Interactive** (no flags): guided wizard — automatic TDEE-based calculation or manual entry; shows computed goals as YAML before saving.

Activity options: `sedentary` / `light` / `moderate` / `very` / `extra`
Goal options: `lose` / `recomp` / `maintain` / `lean-bulk` / `bulk`
Loss rate (kg/week): `0.25` / `0.5` / `0.75`

## daily nutrition goals (`goals`)

Initial goals are best set via `configure`. Use `goals set` to update individual values later.

Directions are fixed: `calories_kcal`, `carbs_g`, `sugar_g`, `fat_g`, `sat_fat_g` are **max** (upper limits); `protein_g`, `fiber_g` are **min** (targets to reach).

```bash
nutrition-claw goals get
nutrition-claw goals set --calories-kcal 2200 --protein-g 160
nutrition-claw goals delete --nutrient protein_g   # delete one
nutrition-claw goals delete                        # delete all
```

## food library (`food`)

Reusable reference of ingredients with nutrition values per a given amount and unit (e.g. per 100g, per 100ml, per 1 tbsp). Values are scaled automatically when added to a meal.

**Intended workflow:** when the user shows a nutrition label, extract the values and `food add` them. Next time they eat that ingredient, use `food search` (semantic) to find it, then `meal ingredient add --food <query> --amount <n> --unit <u>` to auto-scale and log it.

```bash
nutrition-claw food add --name "beef mince" --per-amount 100 --per-unit g --calories-kcal 250 --protein-g 26 --fat-g 17
nutrition-claw food add --name "whole milk" --per-amount 100 --per-unit ml --calories-kcal 61 --protein-g 3.2 --fat-g 3.3
nutrition-claw food add --name "olive oil"  --per-amount 1   --per-unit tbsp --calories-kcal 119 --fat-g 13.5

nutrition-claw food list
nutrition-claw food get "beef mince"           # exact name
nutrition-claw food search "beef"              # semantic — no exact name needed
nutrition-claw food update "beef mince" --protein-g 27
nutrition-claw food delete "beef mince"
```

Supported units — WEIGHT: `g` `kg` `oz` `lb` · VOLUME: `ml` `L` `fl_oz` `cup` `tbsp` `tsp`

## meals (`meal`)

Log what was eaten each day. `--date` and `--time` are always required for `meal add`. Nutrition totals are computed from ingredients at read time, never stored.

```bash
# Create a meal
nutrition-claw meal add --name "Lunch" --date 2026-03-15 --time 13:00
# → id: D-lfLPOP

# Add ingredients (manual)
nutrition-claw meal ingredient add D-lfLPOP --name "Chicken breast" --calories-kcal 165 --protein-g 31 --fat-g 3.6
nutrition-claw meal ingredient add D-lfLPOP --name "Brown rice"     --calories-kcal 200 --protein-g 4  --carbs-g 42 --fat-g 1.6

# Add ingredient from food library (auto-scales by amount)
nutrition-claw meal ingredient add D-lfLPOP --food "beef" --amount 150 --unit g
# → index: 2  matched: beef mince

# Update / delete ingredient by index
nutrition-claw meal ingredient update D-lfLPOP 0 --calories-kcal 170
nutrition-claw meal ingredient delete D-lfLPOP 0

# List meals with computed totals
nutrition-claw meal list --date 2026-03-15

# Rename / delete meal
nutrition-claw meal update D-lfLPOP --name "Dinner"
nutrition-claw meal delete D-lfLPOP
```

## summary / history

```bash
nutrition-claw summary --date 2026-03-15
# → per-nutrient: consumed / goal / pct / status (ok | under | over)

nutrition-claw history --from 2026-03-01 --to 2026-03-15
nutrition-claw history --from 2026-03-15 --days 7   # last 7 days from date
```

## search

Three domain-specific semantic searches — no exact name required:

```bash
nutrition-claw meal search "pasta"                          # by meal name
nutrition-claw meal search "pasta" --from 2026-03-01 --to 2026-03-15

nutrition-claw meal ingredient search "chicken"             # by ingredient
nutrition-claw meal ingredient search "chicken" --from 2026-03-10

nutrition-claw food search "beef"                           # food library only
```
