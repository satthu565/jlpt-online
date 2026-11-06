# N1 December 2019 Listening Timeline Repair

## Overview
Corrects Mondai 4 (Quick Response, Q88–Q100) end cut points in `exam_sections.listening_timeline` for N1 12/2019.
Option 3 speech was clipped across several questions (e.g. Q88 was cut at 1959800 cutting off "やみそうですか", Q96 was cut at 2234300, and Q100 was cut at 2376500).

## Script Usage
```bash
export N1_2019_12_TIMELINE_DIR=/tmp/n1-2019-12-timeline
export N1_2019_12_TIMELINE_BACKUP=/home/jlpt/backups/n1-2019-12-listening-timeline-before-20261106T100258.dump

node repair.mjs plan
node repair.mjs apply
node repair.mjs verify
```
