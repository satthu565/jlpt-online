# N3-2014-07 Listening Timeline Repair (Mondai 5 Q93–Q101)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT n3-2014-07 (`8a770a76-a30a-4bab-a493-ae6a19921af2`).

## Problem
In published version 2:
- Sub-optimal cut points clipped Option 3 audio or swallowed inter-question answering silence.
- Short items truncated dialogue into subsequent questions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q93 | 19 | 1678.00s - 1708.50s | 1678.00s - 1704.35s | 26.35s | Restores Option 3 + clean silence |
| Q94 | 20 | 1708.50s - 1741.00s | 1704.35s - 1736.95s | 32.60s | Restores Option 3 + clean silence |
| Q95 | 21 | 1741.00s - 1762.00s | 1736.95s - 1769.30s | 32.35s | Restores Option 3 + clean silence |
| Q96 | 22 | 1762.00s - 1796.50s | 1769.30s - 1804.25s | 34.95s | Restores Option 3 + clean silence |
| Q97 | 23 | 1796.50s - 1840.50s | 1804.25s - 1836.40s | 32.15s | Restores Option 3 + clean silence |
| Q98 | 24 | 1840.50s - 1863.00s | 1836.40s - 1870.65s | 34.25s | Restores Option 3 + clean silence |
| Q99 | 25 | 1863.00s - 1909.50s | 1870.65s - 1905.05s | 34.40s | Restores Option 3 + clean silence |
| Q100 | 26 | 1909.50s - 1935.00s | 1905.05s - 1942.35s | 37.30s | Restores Option 3 + clean silence |
| Q101 | 27 | 1935.00s - 1987.30s | 1942.35s - 1986.70s | 44.35s | Restores Option 3 + clean silence |

All 102 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2014_07_TIMELINE_DIR=/tmp/n3-2014-07-timeline
export N3_2014_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2014-07-listening-timeline/repair.mjs plan
node tools/content/n3-2014-07-listening-timeline/repair.mjs apply
node tools/content/n3-2014-07-listening-timeline/repair.mjs verify
```
