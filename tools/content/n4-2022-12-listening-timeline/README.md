# N4 December 2022 Listening Timeline Repair (Full Realignment & Mondai 3 & 4 Fix)

## Overview
Corrects the entire `exam_sections.listening_timeline` for JLPT N4 12/2022 (`55063240-ba57-4521-aa71-6fd6b9265696`, `n4-2022-12`).

## Problem
In published version 2:
1. The audio file is 2326.25 seconds long (38m 46s), but the timeline ended prematurely at 1812.25 seconds (missing 514s of audio).
2. As a consequence, Mondai 3 and Mondai 4 were compressed into the time slot of Mondai 2 (1350s to 1812s), misaligning every question.
3. Mondai 4 Question 2 (Item 21) was arbitrarily cut to 20.0s, clipping Option 3 speech into Question 3.
4. Actual Mondai 3 runs from 1695.0s to 1967.0s.
5. Actual Mondai 4 runs from 1973.0s to 2312.5s.

## Changes Table (Mondai 3 & 4 Summary)

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q73 (M3 1番) | 15 | 1350.00s - 1376.00s | 1781.00s - 1808.50s | 27.50s | Restored to real audio location |
| Q74 (M3 2番) | 16 | 1376.00s - 1415.00s | 1808.50s - 1851.00s | 42.50s | Restored to real audio location |
| Q75 (M3 3番) | 17 | 1415.00s - 1470.00s | 1851.00s - 1890.50s | 39.50s | Restored to real audio location |
| Q76 (M3 4番) | 18 | 1470.00s - 1502.00s | 1890.50s - 1935.00s | 44.50s | Restored to real audio location |
| Q77 (M3 5番) | 19 | 1502.00s - 1545.00s | 1935.00s - 2057.00s | 122.00s | Includes M4 directions up to silence |
| Q78 (M4 1番) | 20 | 1545.00s - 1580.00s | 2057.00s - 2086.00s | 29.00s | Restored to real audio location |
| Q79 (M4 2番) | 21 | 1580.00s - 1600.00s | 2086.00s - 2117.00s | 31.00s | Restored Option 3 + silence |
| Q80 (M4 3番) | 22 | 1600.00s - 1642.00s | 2117.00s - 2148.00s | 31.00s | Restored to real audio location |
| Q81 (M4 4番) | 23 | 1642.00s - 1676.00s | 2148.00s - 2185.50s | 37.50s | Restored to real audio location |
| Q82 (M4 5番) | 24 | 1676.00s - 1707.00s | 2185.50s - 2215.50s | 30.00s | Restored to real audio location |
| Q83 (M4 6番) | 25 | 1707.00s - 1735.00s | 2215.50s - 2246.00s | 30.50s | Restored to real audio location |
| Q84 (M4 7番) | 26 | 1735.00s - 1772.00s | 2246.00s - 2281.50s | 35.50s | Restored to real audio location |
| Q85 (M4 8番) | 27 | 1772.00s - 1812.25s | 2281.50s - 2312.50s | 31.00s | Clean cut before closing statement |

All 85 questions and answer keys remain untouched.

## Usage
```bash
export N4_2022_12_TIMELINE_DIR=/tmp/n4-2022-12-timeline
export N4_2022_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n4-2022-12-listening-timeline/repair.mjs plan
node tools/content/n4-2022-12-listening-timeline/repair.mjs apply
node tools/content/n4-2022-12-listening-timeline/repair.mjs verify
```
