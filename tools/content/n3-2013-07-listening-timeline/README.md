# N3-2013-07 Listening Timeline Repair (Mondai 5 Q93–Q101)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT n3-2013-07 (`b5130337-c85b-4723-adad-5b878eb35d40`).

## Problem
In published version 3:
- Sub-optimal cut points clipped Option 3 audio or swallowed inter-question answering silence.
- Short items truncated dialogue into subsequent questions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q93 | 19 | 1553.30s - 1586.70s | 1553.30s - 1580.70s | 27.40s | Restores Option 3 + clean silence |
| Q94 | 20 | 1586.70s - 1620.30s | 1580.70s - 1615.85s | 35.15s | Restores Option 3 + clean silence |
| Q95 | 21 | 1620.30s - 1655.70s | 1615.85s - 1651.25s | 35.40s | Restores Option 3 + clean silence |
| Q96 | 22 | 1655.70s - 1688.50s | 1651.25s - 1684.05s | 32.80s | Restores Option 3 + clean silence |
| Q97 | 23 | 1688.50s - 1723.70s | 1684.05s - 1719.25s | 35.20s | Restores Option 3 + clean silence |
| Q98 | 24 | 1723.70s - 1755.10s | 1719.25s - 1750.70s | 31.45s | Restores Option 3 + clean silence |
| Q99 | 25 | 1755.10s - 1793.50s | 1750.70s - 1789.00s | 38.30s | Restores Option 3 + clean silence |
| Q100 | 26 | 1793.50s - 1827.60s | 1789.00s - 1823.10s | 34.10s | Restores Option 3 + clean silence |
| Q101 | 27 | 1827.60s - 1852.32s | 1823.10s - 1852.32s | 29.22s | Restores Option 3 + clean silence |

All 102 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2013_07_TIMELINE_DIR=/tmp/n3-2013-07-timeline
export N3_2013_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2013-07-listening-timeline/repair.mjs plan
node tools/content/n3-2013-07-listening-timeline/repair.mjs apply
node tools/content/n3-2013-07-listening-timeline/repair.mjs verify
```
