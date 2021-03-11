#!/usr/bin/env bash

while [[ $# -gt 0 ]]
do
key="$1"
case $key in
  -s|--scale-unit)
  SCALE_UNIT="$2"
  shift # past argument
  shift # past value
  ;;
  -d|--duration)
  DURATION="$2"
  shift # past argument
  shift # past value
  ;;
  *)    # unknown option
  echo "Unexpected argument '$1'"
  exit 1
  ;;
esac
done

if [ -z "$SCALE_UNIT" ]; then
  echo "Missing scale unit"
  exit 1
fi

if [ -z "$DURATION" ]; then
  echo "Missing duration"
  exit 1
fi

if [ "$DURATION" = "once" ]; then
  echo "Checking health for scale unit $SCALE_UNIT..."
else
  echo "Checking health for scale unit $SCALE_UNIT for $DURATION..."
fi

echo "Done"
