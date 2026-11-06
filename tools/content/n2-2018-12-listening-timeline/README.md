# N2 December 2018 Listening Timeline Repair (Mondai 4 Q88-Q98 & Mondai 5 Q99)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 boundary cuts in `exam_sections.listening_timeline` for JLPT N2 12/2018 (`f11ef387-1a9f-400d-aa80-8a3b33d532ca`, `n2-2018-12`).

## Problem
In published version 4:
1. Q90 (3番) was prematurely cut at 20.56s (endMs: 1613.46s), clipping Option 3 speech into Q91.
2. Q93 swallowed preceding silence (duration 45.63s).
3. Q94 (7番) was prematurely cut at 21.56s (endMs: 1742.62s), clipping Option 3 speech into Q95.
4. Q97 swallowed preceding silence (duration 47.63s).
5. Q98 swallowed the opening chime of Mondai 5 at 1886.20s.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q88 (1番) | 15 | 1519.71s - 1550.89s | 1519.71s - 1558.00s | 38.29s | Clean cut before 2番 chime |
| Q89 (2番) | 16 | 1550.89s - 1592.90s | 1558.00s - 1588.70s | 30.70s | Clean cut before 3番 chime |
| Q90 (3番) | 17 | 1592.90s - 1613.46s | 1588.70s - 1620.50s | 31.80s | Restores Option 3 in full (+7s silence) |
| Q91 (4番) | 18 | 1613.46s - 1642.87s | 1620.50s - 1650.60s | 30.10s | Clean cut before 5番 chime |
| Q92 (5番) | 19 | 1642.87s - 1675.43s | 1650.60s - 1683.40s | 32.80s | Clean cut before 6番 chime |
| Q93 (6番) | 20 | 1675.43s - 1721.06s | 1683.40s - 1717.10s | 33.70s | Retracts swallow, clean cut before 7番 chime |
| Q94 (7番) | 21 | 1721.06s - 1742.62s | 1717.10s - 1749.70s | 32.60s | Restores Option 3 in full (+7s silence) |
| Q95 (8番) | 22 | 1742.62s - 1774.84s | 1749.70s - 1782.00s | 32.30s | Clean cut before 9番 chime |
| Q96 (9番) | 23 | 1774.84s - 1806.60s | 1782.00s - 1814.00s | 32.00s | Clean cut before 10番 chime |
| Q97 (10番) | 24 | 1806.60s - 1854.23s | 1814.00s - 1850.30s | 36.30s | Retracts swallow, clean cut before 11番 chime |
| Q98 (11番) | 25 | 1854.23s - 1889.37s | 1850.30s - 1885.40s | 35.10s | Retracts swallow of Mondai 5 chime |
| Q99 (M5 Q1) | 26 | 1889.37s - 2024.94s | 1885.40s - 2024.94s | 139.54s | Clean start before Mondai 5 chime |

All 103 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2018_12_TIMELINE_DIR=/tmp/n2-2018-12-timeline
export N2_2018_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n2-2018-12-listening-timeline/repair.mjs plan
node tools/content/n2-2018-12-listening-timeline/repair.mjs apply
node tools/content/n2-2018-12-listening-timeline/repair.mjs verify
```
