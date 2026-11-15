#!/bin/sh
# Link this repo into Cursor / Codex skill directories (or into .cursor/skills for a project).
# Hosts discover databook/SKILL.md. The skill folder links that file plus the
# spec, references, and scaffold so router paths resolve beside the entrypoint.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

usage() {
  cat <<'EOF'
Usage: ./scripts/install-skill.sh [options]

Link the DataBook skill package so Cursor (and optionally Codex) can discover it.

Options:
  --project       Install into ./.cursor/skills/databook with relative symlinks
                  (safe to commit for team/repo discovery). Implies --cursor-only.
  --cursor-only   Install only to ~/.cursor/skills/databook (or .cursor when --project).
  --codex-only    Install only to ${CODEX_HOME:-~/.codex}/skills/databook.
  --help          Show this help.

Default (no flags): personal install to both
  ~/.cursor/skills/databook
  ${CODEX_HOME:-~/.codex}/skills/databook
EOF
}

mode=personal
cursor=1
codex=1

while [ $# -gt 0 ]; do
  case "$1" in
    --project)
      mode=project
      cursor=1
      codex=0
      ;;
    --cursor-only)
      cursor=1
      codex=0
      ;;
    --codex-only)
      cursor=0
      codex=1
      mode=personal
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

# Relpath from directory $1 to file-or-dir $2 (no GNU realpath --relative-to).
relpath_to() {
  from_dir=$1
  to=$2
  from_dir=$(CDPATH= cd -- "$from_dir" && pwd)

  if [ -d "$to" ]; then
    to_dir=$(CDPATH= cd -- "$to" && pwd)
    to_base=
  else
    to_dir=$(CDPATH= cd -- "$(dirname -- "$to")" && pwd)
    to_base=$(basename -- "$to")
  fi

  common=$from_dir
  up=
  while [ "${to_dir#"$common"}" = "$to_dir" ]; do
    common=$(dirname -- "$common")
    up="../$up"
  done
  rest=${to_dir#"$common"}
  rest=${rest#/}
  if [ -n "$to_base" ]; then
    if [ -n "$rest" ]; then
      rest="$rest/$to_base"
    else
      rest=$to_base
    fi
  fi
  printf '%s%s\n' "$up" "$rest"
}

link_one() {
  dest=$1
  target=$2
  link_path=$3

  mkdir -p "$(dirname "$link_path")"
  ln -sfn "$target" "$link_path"
}

# Populate $dest with links into $root. When relative=1, use paths relative to each link.
link_skill() {
  dest=$1
  relative=${2:-0}

  rm -rf "$dest"
  mkdir -p "$dest"

  # Top-level paths
  for name in \
    SKILL.md \
    chart-book-spec.md \
    references \
    src \
    package.json \
    package-lock.json \
    index.html \
    vite.config.ts \
    tsconfig.json \
    public
  do
    if [ "$relative" -eq 1 ]; then
      target=$(relpath_to "$dest" "$root/$name")
    else
      target="$root/$name"
    fi
    link_one "$dest" "$target" "$dest/$name"
  done

  # Nested agents/openai.yaml (keep agents/ dir structure for Codex)
  mkdir -p "$dest/agents"
  if [ "$relative" -eq 1 ]; then
    target=$(relpath_to "$dest/agents" "$root/agents/openai.yaml")
  else
    target="$root/agents/openai.yaml"
  fi
  link_one "$dest" "$target" "$dest/agents/openai.yaml"
}

linked=
if [ "$mode" = project ]; then
  dest="$root/.cursor/skills/databook"
  link_skill "$dest" 1
  linked="$dest"
elif [ "$cursor" -eq 1 ]; then
  dest="${HOME}/.cursor/skills/databook"
  link_skill "$dest" 0
  linked="$dest"
fi

if [ "$codex" -eq 1 ]; then
  dest="${CODEX_HOME:-${HOME}/.codex}/skills/databook"
  link_skill "$dest" 0
  if [ -n "$linked" ]; then
    linked="$linked
$dest"
  else
    linked="$dest"
  fi
fi

echo "Linked $root"
printf '%s\n' "$linked" | while IFS= read -r line; do
  [ -n "$line" ] && echo "  $line"
done
