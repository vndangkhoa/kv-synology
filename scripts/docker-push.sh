#!/usr/bin/env bash
set -euo pipefail
# Push built image to GitHub (GHCR), Forgejo, and Docker Hub.
# Usage:
#   DOCKERHUB_IMAGE=docker.io/<user>/kv-synology \
#   FORGEJO_IMAGE=git.khoavo.myds.me/<user>/kv-synology \
#   FORGEJO_REGISTRY=git.khoavo.myds.me \
#   ./scripts/docker-push.sh [TAG]
#
# Requires: docker login already done for each registry (or set env + run with --push flag below).
#   echo "$DOCKERHUB_TOKEN" | docker login docker.io -u "$DOCKERHUB_USERNAME" --password-stdin
#   echo "$GITHUB_TOKEN"    | docker login ghcr.io -u <gh-user> --password-stdin
#   echo "$FORGEJO_TOKEN"   | docker login "$FORGEJO_REGISTRY" -u "$FORGEJO_USERNAME" --password-stdin

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TAG="${1:-latest}"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")"

# Resolve image names — override via env
GHCR_IMAGE="${GHCR_IMAGE:-ghcr.io/${GITHUB_REPOSITORY:-khoavo/kv-synology}}"
DOCKERHUB_IMAGE="${DOCKERHUB_IMAGE:-}"
FORGEJO_IMAGE="${FORGEJO_IMAGE:-}"
FORGEJO_REGISTRY="${FORGEJO_REGISTRY:-}"

LOCAL_TAG="kv-synology:${TAG}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"

echo "==> Building ${LOCAL_TAG} (version ${VERSION}) for ${PLATFORMS}"
docker buildx build \
  --platform "${PLATFORMS}" \
  -t "${LOCAL_TAG}" \
  -f Dockerfile \
  --load \
  .

# Tag + push for each registry that is configured
push_one() {
  local src="$1" dst="$2" dstLatest="$3"
  echo "==> Tagging ${dst}:${TAG}  and  ${dstLatest}"
  docker tag "${src}" "${dst}:${TAG}"
  docker tag "${src}" "${dstLatest}"
  # Also tag version if semver
  if [[ "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
    docker tag "${src}" "${dst}:${VERSION}"
    docker push "${dst}:${VERSION}"
  fi
  docker push "${dst}:${TAG}"
  docker push "${dstLatest#*:}" 2>/dev/null || docker push "${dst}:latest"
}

# GHCR (always)
if [[ -n "${GHCR_IMAGE}" ]]; then
  echo "==> Pushing to GHCR: ${GHCR_IMAGE}"
  push_one "${LOCAL_TAG}" "${GHCR_IMAGE}" "${GHCR_IMAGE}:latest"
fi

# Docker Hub
if [[ -n "${DOCKERHUB_IMAGE}" ]]; then
  echo "==> Pushing to Docker Hub: ${DOCKERHUB_IMAGE}"
  push_one "${LOCAL_TAG}" "${DOCKERHUB_IMAGE}" "${DOCKERHUB_IMAGE}:latest"
else
  echo "==> SKIP Docker Hub (set DOCKERHUB_IMAGE to enable, e.g. docker.io/<user>/kv-synology)"
fi

# Forgejo
if [[ -n "${FORGEJO_IMAGE}" ]]; then
  echo "==> Pushing to Forgejo: ${FORGEJO_IMAGE}"
  push_one "${LOCAL_TAG}" "${FORGEJO_IMAGE}" "${FORGEJO_IMAGE}:latest"
else
  echo "==> SKIP Forgejo (set FORGEJO_IMAGE to enable, e.g. git.khoavo.myds.me/<user>/kv-synology)"
fi

echo "Done. Images pushed for tag '${TAG}' (version ${VERSION})."
echo "  GHCR:      ${GHCR_IMAGE}:${TAG}"
[[ -n "${DOCKERHUB_IMAGE}" ]] && echo "  DockerHub: ${DOCKERHUB_IMAGE}:${TAG}"
[[ -n "${FORGEJO_IMAGE}"   ]] && echo "  Forgejo:   ${FORGEJO_IMAGE}:${TAG}"
