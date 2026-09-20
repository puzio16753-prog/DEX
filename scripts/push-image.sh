#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_TAG="${IMAGE_TAG:-local}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPOSITORY="${ECR_REPOSITORY:?Set ECR_REPOSITORY to the Terraform ecr_repository_url output}"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${ECR_REPOSITORY%%/*}"

docker build \
  -t "${ECR_REPOSITORY}:${IMAGE_TAG}" \
  -t "${ECR_REPOSITORY}:latest" \
  "$ROOT_DIR/services/scanner"

docker push "${ECR_REPOSITORY}:${IMAGE_TAG}"
docker push "${ECR_REPOSITORY}:latest"

echo "pushed ${ECR_REPOSITORY}:${IMAGE_TAG}"
