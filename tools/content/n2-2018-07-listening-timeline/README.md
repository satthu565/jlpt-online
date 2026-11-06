# N2 July 2018 Listening Timeline Repair (Mondai 4 Q90-Q100 & Mondai 5 Q101)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 boundary cuts in `exam_sections.listening_timeline` for JLPT N2 07/2018 (`f54eab33-0597-41b9-aa58-1d70ebf99801`, `n2-2018-07`).

## Problem
In published version 2:
1. Q97 (8番) was stretched to 45.45s (endMs: 1546.56s), swallowing the opening chime of Q98 (9番) at 1545.40s.
2. Q98 (9番) was cut prematurely at 21.90s (endMs: 1568.46s), clipping Option 3 speech into Q99.
3. Q99 swallowed 10s of preceding silence.
4. Q100 (11番) was cut right after Option 3 speech without adequate thinking time.
5. Q101 (Mondai 5 Q1) started prematurely at 1638.12s, 10s before the Mondai 5 chime at 1648.50s.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q90 (1番) | 15 | 1271.15s - 1304.78s | 1271.15s - 1313.80s | 42.65s | Clean cut before 2番 chime |
| Q91 (2番) | 16 | 1304.78s - 1337.50s | 1313.80s - 1346.80s | 33.00s | Clean cut before 3番 chime |
| Q92 (3番) | 17 | 1337.50s - 1369.35s | 1346.80s - 1378.90s | 32.10s | Clean cut before 4番 chime |
| Q93 (4番) | 18 | 1369.35s - 1399.69s | 1378.90s - 1409.20s | 30.30s | Clean cut before 5番 chime |
| Q94 (5番) | 19 | 1399.69s - 1432.07s | 1409.20s - 1441.80s | 32.60s | Clean cut before 6番 chime |
| Q95 (6番) | 20 | 1432.07s - 1464.60s | 1441.80s - 1474.50s | 32.70s | Clean cut before 7番 chime |
| Q96 (7番) | 21 | 1464.60s - 1501.11s | 1474.50s - 1510.50s | 36.00s | Clean cut before 8番 chime |
| Q97 (8番) | 22 | 1501.11s - 1546.56s | 1510.50s - 1544.60s | 34.10s | Retracts swallow of 9番 chime |
| Q98 (9番) | 23 | 1546.56s - 1568.46s | 1544.60s - 1578.00s | 33.40s | Restores Option 3 in full (+9s silence) |
| Q99 (10番) | 24 | 1568.46s - 1602.18s | 1578.00s - 1612.40s | 34.40s | Clean cut before 11番 chime |
| Q100 (11番) | 25 | 1602.18s - 1638.12s | 1612.40s - 1647.70s | 35.30s | Extends answering time, clean cut before M5 |
| Q101 (M5 Q1) | 26 | 1638.12s - 1794.06s | 1647.70s - 1794.06s | 146.36s | Clean start before Mondai 5 chime |

All 105 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2018_07_TIMELINE_DIR=/tmp/n2-2018-07-timeline
export N2_2018_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n2-2018-07-listening-timeline/repair.mjs plan
node tools/content/n2-2018-07-listening-timeline/repair.mjs apply
node tools/content/n2-2018-07-listening-timeline/repair.mjs verify
```
