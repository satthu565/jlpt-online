# N2 July 2013 Listening Timeline Repair (Mondai 4 Q90-Q101 & Mondai 5 Q102)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 boundary cuts in `exam_sections.listening_timeline` for JLPT N2 07/2013 (`536394c1-bb25-4972-a096-69130206d626`, `n2-2013-07`).

## Problem
In published version 5:
1. Q95 (6番) was cut prematurely at 20.18s (endMs: 1633.80s), truncating Option 3 speech into Q96.
2. Q98 (9番) was cut prematurely at 22.67s (endMs: 1736.70s), truncating Option 3 speech into Q99.
3. Q97 and Q99 absorbed preceding silences (46.87s and 49.11s), while swallow chimes occurred at question boundaries.
4. Q101 swallowed the opening chime of Mondai 5 at 1851.25s.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q90 (1番) | 15 | 1446.16s - 1477.65s | 1446.16s - 1475.80s | 29.64s | Clean cut before 2番 chime |
| Q91 (2番) | 16 | 1477.65s - 1512.63s | 1475.80s - 1511.00s | 35.20s | Clean cut before 3番 chime |
| Q92 (3番) | 17 | 1512.63s - 1547.37s | 1511.00s - 1545.80s | 34.80s | Clean cut before 4番 chime |
| Q93 (4番) | 18 | 1547.37s - 1581.20s | 1545.80s - 1579.40s | 33.60s | Clean cut before 5番 chime |
| Q94 (5番) | 19 | 1581.20s - 1613.62s | 1579.40s - 1611.60s | 32.20s | Clean cut before 6番 chime |
| Q95 (6番) | 20 | 1613.62s - 1633.80s | 1611.60s - 1643.80s | 32.20s | Restores Option 3 in full (+7.7s silence) |
| Q96 (7番) | 21 | 1633.80s - 1667.16s | 1643.80s - 1677.40s | 33.60s | Clean cut before 8番 chime |
| Q97 (8番) | 22 | 1667.16s - 1714.03s | 1677.40s - 1710.20s | 32.80s | Retracts swallow, clean cut before 9番 chime |
| Q98 (9番) | 23 | 1714.03s - 1736.70s | 1710.20s - 1746.60s | 36.40s | Restores Option 3 in full (+7.8s silence) |
| Q99 (10番) | 24 | 1736.70s - 1785.81s | 1746.60s - 1781.90s | 35.30s | Retracts swallow, clean cut before 11番 chime |
| Q100 (11番) | 25 | 1785.81s - 1818.83s | 1781.90s - 1814.70s | 32.80s | Clean cut before 12番 chime |
| Q101 (12番) | 26 | 1818.83s - 1852.74s | 1814.70s - 1850.40s | 35.70s | Retracts swallow of Mondai 5 chime |
| Q102 (M5 Q1) | 27 | 1852.74s - 1983.01s | 1850.40s - 1983.01s | 132.61s | Clean start before Mondai 5 chime & instructions |

All 106 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2013_07_TIMELINE_DIR=/tmp/n2-2013-07-timeline
export N2_2013_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n2-2013-07-listening-timeline/repair.mjs plan
node tools/content/n2-2013-07-listening-timeline/repair.mjs apply
node tools/content/n2-2013-07-listening-timeline/repair.mjs verify
```
