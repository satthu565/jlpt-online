#!/bin/bash
# run-one.sh <slug> <base> <spec-file> : chờ worker rảnh rồi giao việc
slug=$1; base=$2; spec=$3
until BASE=$base /home/jlpt/run-fix.sh start "$slug" "$(cat $spec)" >> /home/jlpt/adhoc-logs/queue.out 2>&1; do
  sleep 20; rm -f /home/jlpt/adhoc-logs/$slug.worker /home/jlpt/adhoc-logs/$slug.desc /home/jlpt/adhoc-logs/$slug.base
done
