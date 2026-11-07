# N3 July 2010 Listening Timeline Repair (Mondai 5 Q93–Q101)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT N3 07/2010 (`11dfb50b-111f-47a3-af1d-6e914d8f56de`, `n3-2010-07`).

## Problem
In published version 2:
1. Q93 (1番) was prematurely cut at 17.96s (endMs: 2358.40s), clipping Option 3 in mid-sentence.
2. Q97 (5番) was prematurely cut at 22.75s (endMs: 2482.33s), clipping Option 3 dialogue into Q98.
3. Q99 (7番) was prematurely cut at 18.94s (endMs: 2546.06s), truncating Option 3 dialogue into Q100.
4. Subsequent questions (Q98, Q100, Q101) swallowed preceding silence and concluding chimes.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q93 (1番) | 19 | 2340.44s - 2358.40s | 2340.44s - 2367.60s | 27.16s | Restores Option 3 + 7.0s thinking silence |
| Q94 (2番) | 20 | 2358.40s - 2389.25s | 2367.60s - 2398.55s | 30.95s | Clean cut before 3番 chime |
| Q95 (3番) | 21 | 2389.25s - 2417.76s | 2398.55s - 2427.10s | 28.55s | Clean cut before 4番 chime |
| Q96 (4番) | 22 | 2417.76s - 2459.58s | 2427.10s - 2457.75s | 30.65s | Trims swallowed silence before 5番 |
| Q97 (5番) | 23 | 2459.58s - 2482.33s | 2457.75s - 2491.55s | 33.80s | Restores Option 3 in full + 7.0s silence |
| Q98 (6番) | 24 | 2482.33s - 2527.12s | 2491.55s - 2525.30s | 33.75s | Clean cut before 7番 chime |
| Q99 (7番) | 25 | 2527.12s - 2546.06s | 2525.30s - 2556.00s | 30.70s | Restores Option 3 in full + 7.1s silence |
| Q100 (8番) | 26 | 2546.06s - 2579.32s | 2556.00s - 2589.05s | 33.05s | Clean cut before 9番 chime |
| Q101 (9番) | 27 | 2579.32s - 2624.63s | 2589.05s - 2622.20s | 33.15s | Ends cleanly before closing announcement |

All 102 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2010_07_TIMELINE_DIR=/tmp/n3-2010-07-timeline
export N3_2010_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2010-07-listening-timeline/repair.mjs plan
node tools/content/n3-2010-07-listening-timeline/repair.mjs apply
node tools/content/n3-2010-07-listening-timeline/repair.mjs verify
```
