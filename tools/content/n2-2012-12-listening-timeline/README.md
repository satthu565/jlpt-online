# N2 December 2012 Listening Timeline Repair (Mondai 4 Q100, Q101 & Mondai 5 Q102)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 boundary cuts in `exam_sections.listening_timeline` for JLPT N2 12/2012 (`decb3df6-f370-46b3-a0ee-8f2b8b50b914`, `n2-2012-12`).

## Problem
In published version 2:
1. Q100 was cut prematurely at 21.36s (at 1745.88s), severing Option 3 (*三 週末だからこんでたんだよ*) into Q101.
2. Q101 was cut prematurely at 1776.85s, clipping Option 3 speech into Q102 (Mondai 5).

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q100 (11番) | 25 | 1724.52s - 1745.88s | 1724.52s - 1754.00s | 29.48s | Restores Option 3 in full (+5.5s silence) |
| Q101 (12番) | 26 | 1745.88s - 1776.85s | 1754.00s - 1785.00s | 31.00s | Restores Option 3 in full (+5.5s silence) |
| Q102 (M5 Q1) | 27 | 1776.85s - 1910.72s | 1785.00s - 1910.72s | 125.72s | Clean start before Mondai 5 instructions |

All 106 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2012_12_TIMELINE_DIR=/tmp/n2-2012-12-timeline
export N2_2012_12_TIMELINE_BACKUP=/home/jlpt/backups/...

node tools/content/n2-2012-12-listening-timeline/repair.mjs plan
node tools/content/n2-2012-12-listening-timeline/repair.mjs apply
node tools/content/n2-2012-12-listening-timeline/repair.mjs verify
```
