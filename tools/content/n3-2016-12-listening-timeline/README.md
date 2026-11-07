# N3-2016-12 Listening Timeline Repair (Mondai 5 Q93–Q101)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT n3-2016-12 (`63c6a92c-47bd-4fd6-a247-36de1b396e6a`).

## Problem
In published version 2:
- Sub-optimal cut points clipped Option 3 audio or swallowed inter-question answering silence.
- Short items truncated dialogue into subsequent questions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q93 | 19 | 1654.88s - 1688.99s | 1654.88s - 1687.08s | 32.20s | Restores Option 3 + clean silence |
| Q94 | 20 | 1688.99s - 1721.98s | 1687.08s - 1720.03s | 32.95s | Restores Option 3 + clean silence |
| Q95 | 21 | 1721.98s - 1754.52s | 1720.03s - 1752.58s | 32.55s | Restores Option 3 + clean silence |
| Q96 | 22 | 1754.52s - 1784.88s | 1752.58s - 1782.93s | 30.35s | Restores Option 3 + clean silence |
| Q97 | 23 | 1784.88s - 1820.23s | 1782.93s - 1818.28s | 35.35s | Restores Option 3 + clean silence |
| Q98 | 24 | 1820.23s - 1854.00s | 1818.28s - 1852.08s | 33.80s | Restores Option 3 + clean silence |
| Q99 | 25 | 1854.00s - 1878.19s | 1852.08s - 1887.28s | 35.20s | Restores Option 3 + clean silence |
| Q100 | 26 | 1878.19s - 1926.10s | 1887.28s - 1924.23s | 36.95s | Restores Option 3 + clean silence |
| Q101 | 27 | 1926.10s - 1956.94s | 1924.23s - 1956.38s | 32.15s | Restores Option 3 + clean silence |

All 102 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2016_12_TIMELINE_DIR=/tmp/n3-2016-12-timeline
export N3_2016_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2016-12-listening-timeline/repair.mjs plan
node tools/content/n3-2016-12-listening-timeline/repair.mjs apply
node tools/content/n3-2016-12-listening-timeline/repair.mjs verify
```
