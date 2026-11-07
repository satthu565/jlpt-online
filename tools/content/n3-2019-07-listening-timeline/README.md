# N3-2019-07 Listening Timeline Repair (Mondai 5 Q93–Q101)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT n3-2019-07 (`49c9f64e-de42-4590-afdc-3407c72ed078`).

## Problem
In published version 2:
- Sub-optimal cut points clipped Option 3 audio or swallowed inter-question answering silence.
- Short items truncated dialogue into subsequent questions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q93 | 19 | 1761.90s - 1847.80s | 1761.90s - 1843.50s | 81.60s | Restores Option 3 + clean silence |
| Q94 | 20 | 1847.80s - 1882.50s | 1843.50s - 1878.15s | 34.65s | Restores Option 3 + clean silence |
| Q95 | 21 | 1882.50s - 1903.50s | 1878.15s - 1910.35s | 32.20s | Restores Option 3 + clean silence |
| Q96 | 22 | 1903.50s - 1937.10s | 1910.35s - 1944.55s | 34.20s | Restores Option 3 + clean silence |
| Q97 | 23 | 1937.10s - 1983.20s | 1944.55s - 1978.95s | 34.40s | Restores Option 3 + clean silence |
| Q98 | 24 | 1983.20s - 2004.50s | 1978.95s - 2011.75s | 32.80s | Restores Option 3 + clean silence |
| Q99 | 25 | 2004.50s - 2049.20s | 2011.75s - 2044.55s | 32.80s | Restores Option 3 + clean silence |
| Q100 | 26 | 2049.20s - 2073.80s | 2044.55s - 2080.90s | 36.35s | Restores Option 3 + clean silence |
| Q101 | 27 | 2073.80s - 2138.01s | 2080.90s - 2137.45s | 56.55s | Restores Option 3 + clean silence |

All 102 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2019_07_TIMELINE_DIR=/tmp/n3-2019-07-timeline
export N3_2019_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2019-07-listening-timeline/repair.mjs plan
node tools/content/n3-2019-07-listening-timeline/repair.mjs apply
node tools/content/n3-2019-07-listening-timeline/repair.mjs verify
```
