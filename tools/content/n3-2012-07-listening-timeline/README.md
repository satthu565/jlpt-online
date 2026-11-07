# N3-2012-07 Listening Timeline Repair (Mondai 5 Q93–Q101)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT n3-2012-07 (`671021b2-a4d6-4492-a5f7-25f3022403d8`).

## Problem
In published version 2:
- Sub-optimal cut points clipped Option 3 audio or swallowed inter-question answering silence.
- Short items truncated dialogue into subsequent questions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q93 | 19 | 1877.00s - 1921.50s | 1877.00s - 1920.65s | 43.65s | Restores Option 3 + clean silence |
| Q94 | 20 | 1922.00s - 1954.50s | 1920.65s - 1953.75s | 33.10s | Restores Option 3 + clean silence |
| Q95 | 21 | 1955.00s - 1978.50s | 1953.75s - 1986.90s | 33.15s | Restores Option 3 + clean silence |
| Q96 | 22 | 1979.00s - 2018.50s | 1986.90s - 2017.55s | 30.65s | Restores Option 3 + clean silence |
| Q97 | 23 | 2019.00s - 2050.50s | 2017.55s - 2050.00s | 32.45s | Restores Option 3 + clean silence |
| Q98 | 24 | 2051.00s - 2074.50s | 2050.00s - 2081.25s | 31.25s | Restores Option 3 + clean silence |
| Q99 | 25 | 2075.00s - 2116.50s | 2081.25s - 2115.65s | 34.40s | Restores Option 3 + clean silence |
| Q100 | 26 | 2117.00s - 2146.50s | 2115.65s - 2146.15s | 30.50s | Restores Option 3 + clean silence |
| Q101 | 27 | 2147.00s - 2192.50s | 2146.15s - 2181.60s | 35.45s | Restores Option 3 + clean silence |

All 102 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2012_07_TIMELINE_DIR=/tmp/n3-2012-07-timeline
export N3_2012_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2012-07-listening-timeline/repair.mjs plan
node tools/content/n3-2012-07-listening-timeline/repair.mjs apply
node tools/content/n3-2012-07-listening-timeline/repair.mjs verify
```
