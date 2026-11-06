# N2 December 2016 Listening Timeline Repair (Mondai 4 Q91-Q102 & Mondai 5 Q103)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 boundary cuts in `exam_sections.listening_timeline` for JLPT N2 12/2016 (`c19f4abc-03dd-4726-aee8-6bd5d1a4f048`, `n2-2016-12`).

## Problem
In published version 2:
1. Q94 (4番) was cut prematurely at 20.59s (endMs: 1763.77s), truncating Option 3 into Q95.
2. Q95 swallowed 8s of preceding silence (duration 43.11s).
3. Q96 (6番) was cut prematurely at 23.24s (endMs: 1830.12s), truncating Option 3 into Q97.
4. Q97 swallowed 8s of preceding silence (duration 46.30s).
5. Q102 swallowed the opening chime of Mondai 5 at 2042.95s.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q91 (1番) | 16 | 1628.53s - 1673.73s | 1628.53s - 1671.60s | 43.07s | Clean cut before 2番 chime |
| Q92 (2番) | 17 | 1673.73s - 1707.92s | 1671.60s - 1705.80s | 34.20s | Clean cut before 3番 chime |
| Q93 (3番) | 18 | 1707.92s - 1743.18s | 1705.80s - 1740.40s | 34.60s | Clean cut before 4番 chime |
| Q94 (4番) | 19 | 1743.18s - 1763.77s | 1740.40s - 1773.20s | 32.80s | Restores Option 3 in full (+7.2s silence) |
| Q95 (5番) | 20 | 1763.77s - 1806.88s | 1773.20s - 1805.10s | 31.90s | Retracts swallow, clean cut before 6番 chime |
| Q96 (6番) | 21 | 1806.88s - 1830.12s | 1805.10s - 1839.60s | 34.50s | Restores Option 3 in full (+7.2s silence) |
| Q97 (7番) | 22 | 1830.12s - 1876.42s | 1839.60s - 1873.10s | 33.50s | Retracts swallow, clean cut before 8番 chime |
| Q98 (8番) | 23 | 1876.42s - 1907.96s | 1873.10s - 1906.30s | 33.20s | Clean cut before 9番 chime |
| Q99 (9番) | 24 | 1907.96s - 1942.52s | 1906.30s - 1940.80s | 34.50s | Clean cut before 10番 chime |
| Q100 (10番) | 25 | 1942.52s - 1977.06s | 1940.80s - 1973.90s | 33.10s | Clean cut before 11番 chime |
| Q101 (11番) | 26 | 1977.06s - 2011.47s | 1973.90s - 2007.90s | 34.00s | Clean cut before 12番 chime |
| Q102 (12番) | 27 | 2011.47s - 2043.97s | 2007.90s - 2042.10s | 34.20s | Retracts swallow of Mondai 5 chime |
| Q103 (M5 Q1) | 28 | 2043.97s - 2175.35s | 2042.10s - 2175.35s | 133.25s | Clean start before Mondai 5 chime |

All 107 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2016_12_TIMELINE_DIR=/tmp/n2-2016-12-timeline
export N2_2016_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n2-2016-12-listening-timeline/repair.mjs plan
node tools/content/n2-2016-12-listening-timeline/repair.mjs apply
node tools/content/n2-2016-12-listening-timeline/repair.mjs verify
```
