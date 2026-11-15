#!/bin/sh
# Link this repo into Cursor and Codex skill directories.
# Hosts discover databook/SKILL.md. The skill folder links that file plus the
# spec, references, and scaffold so router paths resolve beside the entrypoint.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

link_skill() {
  dest=$1
  rm -rf "$dest"
  mkdir -p "$dest"
  ln -s "$root/SKILL.md" "$dest/SKILL.md"
  ln -s "$root/chart-book-spec.md" "$dest/chart-book-spec.md"
  ln -s "$root/references" "$dest/references"
  ln -s "$root/src" "$dest/src"
  mkdir -p "$dest/agents"
  ln -s "$root/agents/openai.yaml" "$dest/agents/openai.yaml"
}

link_skill "${HOME}/.cursor/skills/databook"
link_skill "${CODEX_HOME:-${HOME}/.codex}/skills/databook"

echo "Linked $root"
echo "  ${HOME}/.cursor/skills/databook"
echo "  ${CODEX_HOME:-${HOME}/.codex}/skills/databook"
