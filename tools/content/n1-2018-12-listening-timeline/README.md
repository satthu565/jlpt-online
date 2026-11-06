# N1 December 2018 Listening Timeline Repair

## Overview
Corrects Mondai 4 (Quick Response, Q89–Q101) cut points in `exam_sections.listening_timeline` for N1 12/2018.
Option 3 speech was truncated across several questions (e.g. Q92 was cut short at 23.68s, cutting off Option 3 *この先には店はないと思います*, and Q101 was 82.90s swallowing Mondai 5 directions).

## Script Usage
```bash
export N1_2018_12_TIMELINE_DIR=/tmp/n1-2018-12-timeline
export N1_2018_12_TIMELINE_BACKUP=/home/jlpt/backups/n1-2018-12-listening-timeline-before-20261106T095801.dump

node repair.mjs plan
node repair.mjs apply
node repair.mjs verify
```
