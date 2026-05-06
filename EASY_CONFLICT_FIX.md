# Easy Conflict Fix

The conflict is not happening because one of the listed files is broken. It is happening because the old pull request branch was created from an older version of the repository, and GitHub cannot combine that branch with the current `main` branch in the web editor.

Do **not** try to remake these files one by one in GitHub. That will keep causing confusion.

## Do this instead

On your computer, open Terminal in the repository folder and run these commands exactly:

```bash
git checkout work
git pull
bash scripts/create-clean-pr-branch.sh main ta-website-clean
git push -u origin ta-website-clean
```

Then go to GitHub and open a new pull request:

```text
ta-website-clean -> main
```

After the new PR is open, close the old conflicted PR.

## If `main` does not exist

Some repositories use `master` instead of `main`. If the command above says `main` does not exist, run this instead:

```bash
git checkout work
git pull
bash scripts/create-clean-pr-branch.sh master ta-website-clean
git push -u origin ta-website-clean
```

Then open:

```text
ta-website-clean -> master
```

## What this does in plain English

- It starts with the latest clean version of the repository.
- It copies the finished T&A Contracting website onto that clean version.
- It creates one clean new branch for GitHub.
- It avoids the old PR conflict list completely.

## Why I cannot finish the GitHub conflict from this container

This coding container does not have a GitHub remote configured, and it cannot fetch your GitHub repository from here. That means the actual conflicting `main` branch is not available inside this environment. The files can only be conflict-resolved on a machine or environment that can fetch from GitHub.
