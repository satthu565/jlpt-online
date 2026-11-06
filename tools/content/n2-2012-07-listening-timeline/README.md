# N2 July 2012 Listening Timeline Repair (Mondai 4 Q94–Q101)

## Overview
Corrects Mondai 4 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT N2 07/2012 (`ab937602-28d1-4fb6-a177-9d718858cb50`, `n2-2012-07`).

## Problem
In published version 2:
1. Q94 was truncated at 20.04s (at 1633.52s), cutting off Option 3 (*はい、いつまでですか*).
2. Q97 was erroneously extended to 1725.68s, which swallowed the first 10 seconds of Q98 (8番 prompt *駅前にできたレストラ、行ったことある?*).
3. Q98 was consequently compressed to 20.34s (1725.68s - 1746.02s), missing its prompt and truncating Option 3 (*いえ、まだだそうですよ*).

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q94 (4番) | 19 | 1613.48s - 1633.52s | 1613.48s - 1636.00s | 22.52s | Restores Option 3 in full (+2.0s silence) |
| Q95 (5番) | 20 | 1633.52s - 1659.58s | 1636.00s - 1662.50s | 26.50s | Clean prompt & Options 1-3 |
| Q96 (6番) | 21 | 1659.58s - 1690.74s | 1662.50s - 1692.00s | 29.50s | Clean prompt & Options 1-3 |
| Q97 (7番) | 22 | 1690.74s - 1725.68s | 1692.00s - 1715.00s | 23.00s | Cleanly ends before Q98 prompt |
| Q98 (8番) | 23 | 1725.68s - 1746.02s | 1715.00s - 1748.00s | 33.00s | Restores 8番 prompt and full Option 3 |
| Q99 (9番) | 24 | 1746.02s - 1775.06s | 1748.00s - 1777.00s | 29.00s | Clean prompt & Options 1-3 |
| Q100 (10番) | 25 | 1775.06s - 1812.38s | 1777.00s - 1808.00s | 31.00s | Clean prompt & Options 1-3 |
| Q101 (11番) | 26 | 1812.38s - 1841.26s | 1808.00s - 1841.26s | 33.26s | Clean prompt & Options 1-3 |

All 106 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2012_07_TIMELINE_DIR=/tmp/n2-2012-07-timeline
export N2_2012_07_TIMELINE_BACKUP=/home/jlpt/backups/...

node tools/content/n2-2012-07-listening-timeline/repair.mjs plan
node tools/content/n2-2012-07-listening-timeline/repair.mjs apply
node tools/content/n2-2012-07-listening-timeline/repair.mjs verify
```
