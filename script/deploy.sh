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
  -p|--path)
  DROP_PATH="$2"
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

if [ -z "$DROP_PATH" ]; then
  echo "Missing drop path"
  exit 1
fi

echo "Deploying to $SCALE_UNIT using drop folder $DROP_PATH..."
echo "Done"
