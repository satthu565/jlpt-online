# N1 July 2015 Listening Timeline Repair

## Overview
Corrects Mondai 4 (Quick Response, Q90–Q103) cut points in `exam_sections.listening_timeline` for N1 07/2015.
Option 3 speech was truncated across several questions (e.g. Q90 was cut short at 20.48s, cutting off Option 3 *じゃあ、ミルクがいいな*).

## Script Usage
```bash
export N1_2015_07_TIMELINE_DIR=/tmp/n1-2015-07-timeline
export N1_2015_07_TIMELINE_BACKUP=/home/jlpt/backups/n1-2015-07-listening-timeline-before-20261106T090829.dump

node repair.mjs plan
node repair.mjs apply
node repair.mjs verify
```
