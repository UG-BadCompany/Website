# Create a Clean PR Branch

If GitHub keeps showing conflicts on the old PR, do **not** keep fighting that PR. Create a brand-new branch from the latest `main` and copy the finished T&A Contracting site onto it.

This avoids the conflict list entirely because the new PR starts from the current target branch.

## Steps

Run these from a local clone that has `origin` configured:

```bash
git checkout <branch-with-current-website-code>
bash scripts/create-clean-pr-branch.sh main ta-website-clean
git push -u origin ta-website-clean
```

Then open a new GitHub PR:

```text
ta-website-clean -> main
```

If the repo uses `master` instead of `main`, run:

```bash
git checkout <branch-with-current-website-code>
bash scripts/create-clean-pr-branch.sh master ta-website-clean
git push -u origin ta-website-clean
```

Then open:

```text
ta-website-clean -> master
```

## What this does

1. Saves the current finished website code from your current branch.
2. Fetches the latest target branch from GitHub.
3. Creates a new branch from the latest target branch.
4. Overlays the finished T&A Contracting website code onto that clean branch.
5. Commits the result.
6. Gives you a branch that should not have the old PR's merge-conflict state.

## Why this is different from resolving the old PR

The old PR branch has conflict history against the target branch. This clean-branch workflow starts from the latest target branch first, then applies the finished website code on top as a new commit.
