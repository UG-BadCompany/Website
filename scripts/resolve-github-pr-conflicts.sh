#!/usr/bin/env bash
set -euo pipefail

# Resolve the GitHub PR conflict list by merging the latest target branch
# into the current PR branch and keeping this branch's implementation for
# the listed website/portal files.
#
# Usage:
#   git checkout <your-pr-branch>
#   bash scripts/resolve-github-pr-conflicts.sh main
#
# If your target branch is master instead of main:
#   bash scripts/resolve-github-pr-conflicts.sh master

TARGET_BRANCH="${1:-main}"
REMOTE_NAME="${REMOTE_NAME:-origin}"

CONFLICT_FILES=(
  "JOB_COMPLETED_CHECK.md"
  "app/api/auth/login/route.ts"
  "app/api/auth/password-reset/route.ts"
  "app/api/auth/register/route.ts"
  "app/api/files/route.ts"
  "app/api/invoices/[invoiceId]/pdf/route.ts"
  "app/api/invoices/route.ts"
  "app/api/job-requests/route.ts"
  "app/api/messages/route.ts"
  "app/api/payments/checkout/route.ts"
  "app/api/quotes/[quoteId]/accept/route.ts"
  "app/api/quotes/[quoteId]/decline/route.ts"
  "app/api/quotes/[quoteId]/pdf/route.ts"
  "app/api/quotes/route.ts"
  "app/api/schedule/route.ts"
  "app/api/worker/jobs/route.ts"
  "app/components/Footer.tsx"
  "app/contact/page.tsx"
  "app/lib/auth.ts"
  "app/lib/database.ts"
  "app/lib/email.ts"
  "app/lib/stripe.ts"
  "app/lib/types.ts"
  "app/login/page.tsx"
  "app/portal/admin/page.tsx"
)

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes before resolving PR conflicts." >&2
  git status --short
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ -z "${CURRENT_BRANCH}" ]]; then
  echo "You must be on the PR branch before running this script." >&2
  exit 1
fi

echo "Fetching ${REMOTE_NAME}/${TARGET_BRANCH}..."
git fetch "${REMOTE_NAME}" "${TARGET_BRANCH}"

echo "Merging ${REMOTE_NAME}/${TARGET_BRANCH} into ${CURRENT_BRANCH}..."
set +e
git merge --no-edit "${REMOTE_NAME}/${TARGET_BRANCH}"
MERGE_EXIT=$?
set -e

if [[ ${MERGE_EXIT} -eq 0 ]]; then
  echo "Merge completed without conflicts. Nothing else to resolve."
  exit 0
fi

echo "Merge reported conflicts. Keeping PR branch versions for known website files..."
for file in "${CONFLICT_FILES[@]}"; do
  if git ls-files --unmerged --error-unmatch "${file}" >/dev/null 2>&1; then
    git checkout --ours -- "${file}"
    git add "${file}"
  fi
done

UNMERGED="$(git diff --name-only --diff-filter=U)"
if [[ -n "${UNMERGED}" ]]; then
  echo "Some conflicts remain and need manual review:" >&2
  echo "${UNMERGED}" >&2
  exit 1
fi

git commit -m "Resolve PR conflicts with ${TARGET_BRANCH}"
echo "Resolved conflicts and created a merge commit. Push ${CURRENT_BRANCH} to update the PR."
