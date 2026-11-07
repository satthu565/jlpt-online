# N3-2025-07 Listening Timeline Repair (Mondai 5 Q92–Q100)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT n3-2025-07 (`05d8af4f-c4d9-4793-ab5b-9c2c67d956a9`).

## Problem
In published version 3:
- Sub-optimal cut points clipped Option 3 audio or swallowed inter-question answering silence.
- Short items truncated dialogue into subsequent questions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q92 | 19 | 2106.24s - 2134.48s | 2106.24s - 2132.54s | 26.30s | Restores Option 3 + clean silence |
| Q93 | 20 | 2134.48s - 2163.44s | 2132.54s - 2161.49s | 28.95s | Restores Option 3 + clean silence |
| Q94 | 21 | 2163.44s - 2190.70s | 2161.49s - 2188.79s | 27.30s | Restores Option 3 + clean silence |
| Q95 | 22 | 2190.70s - 2218.10s | 2188.79s - 2216.09s | 27.30s | Restores Option 3 + clean silence |
| Q96 | 23 | 2218.10s - 2246.30s | 2216.09s - 2244.44s | 28.35s | Restores Option 3 + clean silence |
| Q97 | 24 | 2246.30s - 2274.70s | 2244.44s - 2272.84s | 28.40s | Restores Option 3 + clean silence |
| Q98 | 25 | 2274.70s - 2303.80s | 2272.84s - 2301.94s | 29.10s | Restores Option 3 + clean silence |
| Q99 | 26 | 2303.80s - 2328.40s | 2301.94s - 2332.19s | 30.25s | Restores Option 3 + clean silence |
| Q100 | 27 | 2328.40s - 2399.57s | 2332.19s - 2366.54s | 34.35s | Restores Option 3 + clean silence |

All 101 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2025_07_TIMELINE_DIR=/tmp/n3-2025-07-timeline
export N3_2025_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2025-07-listening-timeline/repair.mjs plan
node tools/content/n3-2025-07-listening-timeline/repair.mjs apply
node tools/content/n3-2025-07-listening-timeline/repair.mjs verify
```
