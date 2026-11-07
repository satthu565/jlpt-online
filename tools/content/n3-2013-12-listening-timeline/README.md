# N3-2013-12 Listening Timeline Repair (Mondai 5 Q93–Q101)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT n3-2013-12 (`fbe4cc57-1473-46f7-a197-29b33da97f31`).

## Problem
In published version 2:
- Sub-optimal cut points clipped Option 3 audio or swallowed inter-question answering silence.
- Short items truncated dialogue into subsequent questions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q93 | 19 | 1627.84s - 1659.92s | 1627.84s - 1657.99s | 30.15s | Restores Option 3 + clean silence |
| Q94 | 20 | 1659.92s - 1696.03s | 1657.99s - 1694.09s | 36.10s | Restores Option 3 + clean silence |
| Q95 | 21 | 1696.03s - 1725.39s | 1694.09s - 1723.44s | 29.35s | Restores Option 3 + clean silence |
| Q96 | 22 | 1725.39s - 1759.84s | 1723.44s - 1757.94s | 34.50s | Restores Option 3 + clean silence |
| Q97 | 23 | 1759.84s - 1792.16s | 1757.94s - 1790.24s | 32.30s | Restores Option 3 + clean silence |
| Q98 | 24 | 1792.16s - 1825.20s | 1790.24s - 1823.29s | 33.05s | Restores Option 3 + clean silence |
| Q99 | 25 | 1825.20s - 1847.23s | 1823.29s - 1856.44s | 33.15s | Restores Option 3 + clean silence |
| Q100 | 26 | 1847.23s - 1891.96s | 1856.44s - 1890.04s | 33.60s | Restores Option 3 + clean silence |
| Q101 | 27 | 1891.96s - 1922.36s | 1890.04s - 1921.79s | 31.75s | Restores Option 3 + clean silence |

All 102 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2013_12_TIMELINE_DIR=/tmp/n3-2013-12-timeline
export N3_2013_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2013-12-listening-timeline/repair.mjs plan
node tools/content/n3-2013-12-listening-timeline/repair.mjs apply
node tools/content/n3-2013-12-listening-timeline/repair.mjs verify
```
