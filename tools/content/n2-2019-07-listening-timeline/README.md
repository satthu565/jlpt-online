# N2 July 2019 Listening Timeline Repair (Mondai 4 Q88-Q98 & Mondai 5 Q99)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 boundary cuts in `exam_sections.listening_timeline` for JLPT N2 07/2019 (`1c059a1d-08a0-4cf5-a5fb-38658d079a84`, `n2-2019-07`).

## Problem
In published version 4:
1. Q94 (7番) was cut prematurely at 23.55s (endMs: 1976.72s), clipping Option 3 speech into Q95.
2. Q95 swallowed 8.25s of preceding silence (duration 47.01s).
3. Q98 was cut prematurely without adequate answering time before Mondai 5 chime at 2131.85s.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q88 (1番) | 15 | 1751.04s - 1785.09s | 1751.04s - 1781.10s | 30.06s | Clean cut before 2番 chime |
| Q89 (2番) | 16 | 1785.09s - 1821.52s | 1781.10s - 1817.50s | 36.40s | Clean cut before 3番 chime |
| Q90 (3番) | 17 | 1821.52s - 1855.51s | 1817.50s - 1851.40s | 33.90s | Clean cut before 4番 chime |
| Q91 (4番) | 18 | 1855.51s - 1889.38s | 1851.40s - 1885.40s | 34.00s | Clean cut before 5番 chime |
| Q92 (5番) | 19 | 1889.38s - 1920.48s | 1885.40s - 1916.40s | 31.00s | Clean cut before 6番 chime |
| Q93 (6番) | 20 | 1920.48s - 1953.17s | 1916.40s - 1949.10s | 32.70s | Clean cut before 7番 chime |
| Q94 (7番) | 21 | 1953.17s - 1976.72s | 1949.10s - 1984.00s | 34.90s | Restores Option 3 in full (+7.3s silence) |
| Q95 (8番) | 22 | 1976.72s - 2023.73s | 1984.00s - 2019.70s | 35.70s | Retracts swallow, clean cut before 9番 chime |
| Q96 (9番) | 23 | 2023.73s - 2062.50s | 2019.70s - 2058.50s | 38.80s | Clean cut before 10番 chime |
| Q97 (10番) | 24 | 2062.50s - 2098.60s | 2058.50s - 2094.50s | 36.00s | Clean cut before 11番 chime |
| Q98 (11番) | 25 | 2098.60s - 2139.90s | 2094.50s - 2130.90s | 36.40s | Clean cut before M5 chime |
| Q99 (M5 Q1) | 26 | 2139.90s - 2347.90s | 2130.90s - 2347.90s | 217.00s | Clean start before Mondai 5 chime |

All 103 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2019_07_TIMELINE_DIR=/tmp/n2-2019-07-timeline
export N2_2019_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n2-2019-07-listening-timeline/repair.mjs plan
node tools/content/n2-2019-07-listening-timeline/repair.mjs apply
node tools/content/n2-2019-07-listening-timeline/repair.mjs verify
```
