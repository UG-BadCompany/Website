#!/usr/bin/env bash
set -euo pipefail

# Create a brand-new PR branch from the latest target branch, then overlay the
# current T&A Contracting website implementation onto it. This avoids GitHub's
# "conflicts too complex for web editor" state because the new branch starts
# from the current target branch instead of trying to merge an old conflicted PR.
#
# Usage from the branch that has the finished website code:
#   bash scripts/create-clean-pr-branch.sh main ta-website-clean
#
# If your target branch is master:
#   bash scripts/create-clean-pr-branch.sh master ta-website-clean

TARGET_BRANCH="${1:-main}"
NEW_BRANCH="${2:-ta-website-clean-pr}"
REMOTE_NAME="${REMOTE_NAME:-origin}"
SOURCE_REF="${SOURCE_REF:-HEAD}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes before creating a clean PR branch." >&2
  git status --short
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/${NEW_BRANCH}"; then
  echo "Local branch '${NEW_BRANCH}' already exists. Choose a different new branch name." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

echo "Saving current implementation from ${SOURCE_REF}..."
git archive "${SOURCE_REF}" | tar -x -C "${TMP_DIR}"

echo "Fetching latest ${REMOTE_NAME}/${TARGET_BRANCH}..."
git fetch "${REMOTE_NAME}" "${TARGET_BRANCH}"

echo "Creating ${NEW_BRANCH} from ${REMOTE_NAME}/${TARGET_BRANCH}..."
git switch -c "${NEW_BRANCH}" "${REMOTE_NAME}/${TARGET_BRANCH}"

echo "Overlaying current T&A Contracting implementation onto ${NEW_BRANCH}..."
tar -C "${TMP_DIR}" -cf - . | tar -x -f - -C .

git add -A
if git diff --cached --quiet; then
  echo "No changes were produced after overlay. Nothing to commit."
  exit 0
fi

git commit -m "Apply T&A Contracting website and portal"

echo "Clean PR branch '${NEW_BRANCH}' is ready. Push it with:"
echo "  git push -u ${REMOTE_NAME} ${NEW_BRANCH}"
echo "Then open a brand-new PR from '${NEW_BRANCH}' into '${TARGET_BRANCH}'."
