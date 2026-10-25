#!/usr/bin/env bash
# Keep scheduled workflows alive. GitHub disables schedules in a public repository after 60 days
# with no repository activity. Two layers:
#  1. re-enable every workflow through the API (a no-op while they are enabled);
#  2. if the last commit is older than 45 days, push an empty commit, which counts as activity.
# Commits made with GITHUB_TOKEN do not trigger other workflows, so this cannot loop.
set -euo pipefail
repo="${GITHUB_REPOSITORY:?}"
for wf in $(gh api "repos/$repo/actions/workflows" --jq '.workflows[].id'); do
  gh api -X PUT "repos/$repo/actions/workflows/$wf/enable" >/dev/null && echo "enabled workflow $wf"
done
last=$(git log -1 --format=%ct)
age_days=$(( ( $(date +%s) - last ) / 86400 ))
echo "last commit ${age_days} days ago"
if (( age_days >= 45 )); then
  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git commit --allow-empty -m "keepalive: scheduled workflows stay enabled ($(date -u +%F))"
  git push
fi
