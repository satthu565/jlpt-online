# N5 December 2021 Listening Timeline Repair (Mondai 4 Q62-Q67)

## Overview
Corrects Mondai 4 (Quick Response) boundary cuts in exam_sections.listening_timeline for JLPT N5 12/2021 (ed7f479b-196e-4d4e-a549-da61cc5cbebe, 
5-2021-12).

## Problem
In published version 2:
1. Q62 (M4 1番) cut was set at 1586.66s, cutting into the 2番 chime (starts at 1585.76s).
2. Q63 (M4 2番) cut was set at 1613.29s, cutting into the 3番 chime (starts at 1612.34s).
3. Q64 (M4 3番) cut was set at 1640.22s, cutting into the 4番 chime (starts at 1639.28s).
4. Q65 (M4 4番) cut was set at 1671.11s, cutting into the 5番 chime (starts at 1670.16s).
5. Q66 (M4 5番) cut was set at 1703.89s, cutting into the 6番 chime (starts at 1702.98s).
6. Q67 (M4 6番) cut was set at 1747.20s, swallowing the entire closing announcement ("これで聴解試験を終わります...").

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q62 (M4 1番) | 18 | 1564.00s - 1586.66s | 1564.00s - 1583.15s | 19.15s | Clean cut in digital silence before 2番 chime |
| Q63 (M4 2番) | 19 | 1586.66s - 1613.29s | 1583.15s - 1609.71s | 26.56s | Clean cut in digital silence before 3番 chime |
| Q64 (M4 3番) | 20 | 1613.29s - 1640.22s | 1609.71s - 1636.64s | 26.93s | Clean cut in digital silence before 4番 chime |
| Q65 (M4 4番) | 21 | 1640.22s - 1671.11s | 1636.64s - 1666.05s | 29.41s | Clean cut in digital silence before 5番 chime |
| Q66 (M4 5番) | 22 | 1671.11s - 1703.89s | 1666.05s - 1698.83s | 32.78s | Clean cut in digital silence before 6番 chime |
| Q67 (M4 6番) | 23 | 1703.89s - 1747.20s | 1698.83s - 1733.41s | 34.58s | Clean cut in digital silence before closing statement |

All cut boundaries align with digital silence (RMS = 0.000000). All 67 questions and answer keys remain untouched.

## Usage
`ash
export N5_2021_12_TIMELINE_DIR=/tmp/n5-2021-12-timeline
export N5_2021_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n5-2021-12-listening-timeline/repair.mjs plan
node tools/content/n5-2021-12-listening-timeline/repair.mjs apply
node tools/content/n5-2021-12-listening-timeline/repair.mjs verify
`
