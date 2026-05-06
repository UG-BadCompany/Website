# Command-Line Conflict Resolution

GitHub is reporting that the PR cannot be resolved in the web editor because many website and portal files conflict with the target branch. Resolve it from the command line instead.

## Recommended steps

From a local clone that has the GitHub remote configured:

```bash
git checkout <your-pr-branch>
bash scripts/resolve-github-pr-conflicts.sh main
git push
```

If your repository uses `master` instead of `main`:

```bash
git checkout <your-pr-branch>
bash scripts/resolve-github-pr-conflicts.sh master
git push
```

## What the script does

1. Fetches the latest target branch from `origin`.
2. Merges the target branch into the current PR branch.
3. For the exact conflict list GitHub showed, keeps the PR branch version of the T&A Contracting website/portal implementation.
4. Stops if any unexpected conflicts remain.
5. Creates a merge commit named `Resolve PR conflicts with main` or `Resolve PR conflicts with master`.

## Important

Run this only on the PR branch that contains the current T&A Contracting website work. The current branch should already include the Vercel request-estimate JSX parser fix and the dynamic portal page updates.
