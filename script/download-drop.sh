#!/usr/bin/env bash

while [[ $# -gt 0 ]]
do
key="$1"
case $key in
  -v|--version)
  VERSION="$2"
  shift # past argument
  shift # past value
  ;;
  -p|--path)
  DOWNLOAD_PATH="$2"
  shift # past argument
  shift # past value
  ;;
  *)    # unknown option
  echo "Unexpected argument '$1'"
  exit 1
  ;;
esac
done

if [ -z "$VERSION" ]; then
  echo "Missing version"
  exit 1
fi

if [ -z "$DOWNLOAD_PATH" ]; then
  echo "Missing download path"
  exit 1
fi

echo "Downloading build $VERSION to folder $DOWNLOAD_PATH..."
echo "Done"
