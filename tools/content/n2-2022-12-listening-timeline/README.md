# N2 December 2022 Listening Timeline Repair (Mondai 4 Q87-Q97 & Mondai 5 Q98)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 boundary cuts in `exam_sections.listening_timeline` for JLPT N2 12/2022 (`360a3c45-887d-46a6-a3e4-e660868b35f2`, `n2-2022-12`).

## Problem
In published version 8:
1. Q93 (7番) was cut prematurely at 24.24s (endMs: 2318.92s), clipping Option 3 speech into Q94.
2. Q94 swallowed 7.4s of preceding silence (duration 47.50s).
3. Q95 (9番) was cut prematurely at 24.40s (endMs: 2390.82s), clipping Option 3 speech into Q96.
4. Q96 swallowed 9.3s of preceding silence (duration 44.30s).
5. Q97 (11番) was extended to 2516.87s (duration 81.75s), swallowing the entire Mondai 5 directions and instructions, causing Mondai 5 Question 1 to start midway through conversation.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q87 (1番) | 16 | 2091.01s - 2125.73s | 2091.01s - 2123.90s | 32.89s | Clean cut before 2番 chime |
| Q88 (2番) | 17 | 2125.73s - 2159.38s | 2123.90s - 2157.40s | 33.50s | Clean cut before 3番 chime |
| Q89 (3番) | 18 | 2159.38s - 2195.33s | 2157.40s - 2193.30s | 35.90s | Clean cut before 4番 chime |
| Q90 (4番) | 19 | 2195.33s - 2230.37s | 2193.30s - 2228.45s | 35.15s | Clean cut before 5番 chime |
| Q91 (5番) | 20 | 2230.37s - 2264.18s | 2228.45s - 2262.35s | 33.90s | Clean cut before 6番 chime |
| Q92 (6番) | 21 | 2264.18s - 2294.68s | 2262.35s - 2292.80s | 30.45s | Clean cut before 7番 chime |
| Q93 (7番) | 22 | 2294.68s - 2318.92s | 2292.80s - 2328.35s | 35.55s | Restores Option 3 + 8.2s thinking silence |
| Q94 (8番) | 23 | 2318.92s - 2366.42s | 2328.35s - 2364.65s | 36.30s | Clean cut before 9番 chime |
| Q95 (9番) | 24 | 2366.42s - 2390.82s | 2364.65s - 2400.15s | 35.50s | Restores Option 3 + 8.15s thinking silence |
| Q96 (10番) | 25 | 2390.82s - 2435.12s | 2400.15s - 2433.20s | 33.05s | Clean cut before 11番 chime |
| Q97 (11番) | 26 | 2435.12s - 2516.87s | 2433.20s - 2472.00s | 38.80s | Restores clean cut before Mondai 5 |
| Q98 (M5 Q1) | 27 | 2516.87s - 2649.72s | 2472.00s - 2649.72s | 177.72s | Restores full Mondai 5 instructions |

All 101 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2022_12_TIMELINE_DIR=/tmp/n2-2022-12-timeline
export N2_2022_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n2-2022-12-listening-timeline/repair.mjs plan
node tools/content/n2-2022-12-listening-timeline/repair.mjs apply
node tools/content/n2-2022-12-listening-timeline/repair.mjs verify
```
