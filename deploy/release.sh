#!/usr/bin/env bash
# Author: Alex Picon <alexnpc@me.com>
set -euo pipefail
revision=${1:?commit SHA required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || exit 2
cd /opt/keeper
exec 9>deploy.lock
flock 9
release="releases/$revision"
test -f "$release/Dockerfile"
test -f shared/.env
image="keeper:$revision"
docker build --label "org.opencontainers.image.revision=$revision" -t "$image" "$release"
docker rm -f keeper-candidate >/dev/null 2>&1 || true
cleanup() { docker rm -f keeper-candidate >/dev/null 2>&1 || true; }
trap cleanup EXIT
run_app() {
  docker run -d --name "$1" --restart unless-stopped --user "$(id -u):$(id -g)" \
    --mount "type=bind,src=/opt/keeper/shared/.env,dst=/app/.env,readonly" \
    --log-opt max-size=10m --log-opt max-file=3 \
    -p "127.0.0.1:$2:8888" "$image"
}
healthy() {
  for attempt in {1..30}; do
    if curl -fsS "http://127.0.0.1:$1/healthz" >/dev/null && \
       curl -fsS "http://127.0.0.1:$1/keeper/" >/dev/null; then return 0; fi
    sleep 2
  done
  return 1
}
run_app keeper-candidate 18080
healthy 18080
cleanup
docker rm -f keeper-previous >/dev/null 2>&1 || true
if docker inspect keeper >/dev/null 2>&1; then
  docker stop keeper
  docker rename keeper keeper-previous
fi
if run_app keeper 8888 && healthy 8888; then
  echo "$revision" > deployed-revision
  echo "Deployed $revision"
  # Bound disk growth: retain only current and rollback images/releases.
  previous_image=$(docker inspect -f '{{.Config.Image}}' keeper-previous 2>/dev/null || true)
  while IFS= read -r old_image; do
    if [[ "$old_image" != "$image" && "$old_image" != "$previous_image" ]]; then
      docker image rm "$old_image" >/dev/null 2>&1 || true
    fi
  done < <(docker images keeper --format '{{.Repository}}:{{.Tag}}')
  for old_release in releases/*; do
    old_revision=${old_release##*/}
    if [[ "$old_revision" =~ ^[0-9a-f]{40}$ && "$old_revision" != "$revision" && "keeper:$old_revision" != "$previous_image" ]]; then
      rm -rf -- "$old_release"
    fi
  done
  docker builder prune -f --keep-storage 1GB >/dev/null 2>&1 || true
else
  docker rm -f keeper >/dev/null 2>&1 || true
  if docker inspect keeper-previous >/dev/null 2>&1; then
    docker rename keeper-previous keeper
    docker start keeper
  fi
  echo 'Deployment failed; restored previous container.' >&2
  exit 1
fi
