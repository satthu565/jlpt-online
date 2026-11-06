# N1 July 2017 Listening Timeline Repair

## Overview
Corrects Mondai 4 (Quick Response, Q89–Q101) cut points in `exam_sections.listening_timeline` for N1 07/2017.
Option 3 speech was truncated across several questions (e.g. Q90 was 24.19s, Q92 was 23.94s, Q97 was 22.97s, and Q101 was 82.59s swallowing Mondai 5 directions).

## Script Usage
```bash
export N1_2017_07_TIMELINE_DIR=/tmp/n1-2017-07-timeline
export N1_2017_07_TIMELINE_BACKUP=/home/jlpt/backups/n1-2017-07-listening-timeline-before-20261106T092342.dump

node repair.mjs plan
node repair.mjs apply
node repair.mjs verify
```
