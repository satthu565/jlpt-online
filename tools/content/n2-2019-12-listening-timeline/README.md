# N2 December 2019 Listening Timeline Repair (Mondai 4 Q87-Q97 & Mondai 5 Q98)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 boundary cuts in `exam_sections.listening_timeline` for JLPT N2 12/2019 (`3e10f612-14d4-4994-a42c-46301e013589`, `n2-2019-12`).

## Problem
In published version 4:
1. Q91 (5番) was cut prematurely at 22.00s (endMs: 1725.0s), clipping thinking silence.
2. Q95 (9番) was cut prematurely at 22.50s (endMs: 1860.5s), clipping thinking silence.
3. Q97 (11番) was cut at 1925.0s before Option 3 speech finished (at 1926.8s), clipping dialogue into Mondai 5.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q87 (1番) | 15 | 1560.50s - 1595.50s | 1560.50s - 1602.80s | 42.30s | Clean cut before 2番 chime |
| Q88 (2番) | 16 | 1595.50s - 1638.50s | 1602.80s - 1634.35s | 31.55s | Clean cut before 3番 chime |
| Q89 (3番) | 17 | 1638.50s - 1671.00s | 1634.35s - 1667.05s | 32.70s | Clean cut before 4番 chime |
| Q90 (4番) | 18 | 1671.00s - 1703.00s | 1667.05s - 1699.00s | 31.95s | Clean cut before 5番 chime |
| Q91 (5番) | 19 | 1703.00s - 1725.00s | 1699.00s - 1732.25s | 33.25s | Restores Option 3 + 8.2s thinking silence |
| Q92 (6番) | 20 | 1725.00s - 1768.40s | 1732.25s - 1764.20s | 31.95s | Clean cut before 7番 chime |
| Q93 (7番) | 21 | 1768.40s - 1804.00s | 1764.20s - 1800.00s | 35.80s | Clean cut before 8番 chime |
| Q94 (8番) | 22 | 1804.00s - 1838.00s | 1800.00s - 1834.20s | 34.20s | Clean cut before 9番 chime |
| Q95 (9番) | 23 | 1838.00s - 1860.50s | 1834.20s - 1867.70s | 33.50s | Restores Option 3 + 8.15s thinking silence |
| Q96 (10番) | 24 | 1860.50s - 1893.50s | 1867.70s - 1900.70s | 33.00s | Clean cut before 11番 chime |
| Q97 (11番) | 25 | 1893.50s - 1925.00s | 1900.70s - 1936.50s | 35.80s | Restores Option 3 dialogue + thinking silence |
| Q98 (M5 Q1) | 26 | 1925.00s - 2110.00s | 1936.50s - 2110.00s | 173.50s | Restores clean Mondai 5 instructions |

All 102 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2019_12_TIMELINE_DIR=/tmp/n2-2019-12-timeline
export N2_2019_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n2-2019-12-listening-timeline/repair.mjs plan
node tools/content/n2-2019-12-listening-timeline/repair.mjs apply
node tools/content/n2-2019-12-listening-timeline/repair.mjs verify
```
