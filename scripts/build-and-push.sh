#!/usr/bin/env bash
set -e

IMAGE="time4action/recharge-partners-integration-api"
DATE_TAG="$(date +%Y%m%d-%H%M%S)"

case "$1" in
  --latest) TAG="latest" ;;
  --dev)    TAG="dev" ;;
  *)        TAG="$DATE_TAG" ;;
esac

echo "[build] Building $IMAGE:$TAG..."
docker build -t "$IMAGE:$TAG" .

if [ "$TAG" != "$DATE_TAG" ]; then
  echo "[build] Also tagging as $IMAGE:$DATE_TAG..."
  docker tag "$IMAGE:$TAG" "$IMAGE:$DATE_TAG"
fi

echo "[push] Pushing $IMAGE:$TAG..."
docker push "$IMAGE:$TAG"

if [ "$TAG" != "$DATE_TAG" ]; then
  echo "[push] Also pushing $IMAGE:$DATE_TAG..."
  docker push "$IMAGE:$DATE_TAG"
fi

echo "Build and push completed successfully"
