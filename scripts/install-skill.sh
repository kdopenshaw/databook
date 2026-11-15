#!/bin/sh
# Link this repo into Cursor / Codex skill directories (or into .cursor/skills for a project).
# Hosts discover databook/SKILL.md. The skill folder links that file plus the
# spec, references, and scaffold so router paths resolve beside the entrypoint.
#
# Prerequisite: Node.js 20+ (for Vite / vitest when running a book).
# Never run `npm install` inside the skill install folder — copy the scaffold
# into your target project first, then install there.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
# --project installs into the caller's cwd (target project), not the product clone.
cwd=$(pwd)

usage() {
  cat <<'EOF'
Usage: ./scripts/install-skill.sh [options]

Link the DataBook skill package so Cursor (and optionally Codex) can discover it.

Prerequisite: Node.js 20+ on PATH (books use Vite + vitest).

Options:
  --project       Install into $PWD/.cursor/skills/databook with relative
                  symlinks back to this DataBook clone (safe to commit for
                  team/repo discovery). Implies --cursor-only.
                  Run this from the *target project* directory, not only
                  from inside the DataBook clone.
  --cursor-only   Install only to ~/.cursor/skills/databook (or .cursor when --project).
  --codex-only    Install only to ${CODEX_HOME:-~/.codex}/skills/databook.
  --help          Show this help.

Default (no flags): personal install to both
  ~/.cursor/skills/databook
  ${CODEX_HOME:-~/.codex}/skills/databook

Do NOT run `npm install` in the skill install directory. That would write
node_modules into this product clone via symlinks. Copy the scaffold into
your chart-book target, then `npm install` there.
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

write_skill_readme() {
  dest=$1
  cat >"$dest/README.md" <<'EOF'
# DataBook skill package (do not `npm install` here)

This directory is for **Cursor/Codex skill discovery** only.

- Read `SKILL.md` and follow the pipeline there.
- Copy the scaffold into your **target** chart-book project, then run `npm install` in that target.
- Symlinks here point at the product clone. Running `npm install` in this folder would pollute the clone via those links.

Scaffold copy list: see `scaffold-files.txt` next to this README (or `SKILL.md` → Init).
EOF
}

write_scaffold_manifest() {
  dest=$1
  cat >"$dest/scaffold-files.txt" <<'EOF'
# Files to copy from this skill package into the target book root (init).
# Do not npm install inside the skill package — copy first, install in the target.
SKILL.md                 # optional reference only; product entry stays in skill install
chart-book-spec.md       # optional local copy for agents
index.html
package.json
package-lock.json
tsconfig.json
vite.config.ts
public/
src/
scripts/                 # check-book.mjs — required for `npm run check` / visual QA
.gitignore               # scaffold gitignore (node_modules, dist, …)
# After copy: set index.html <title> from BookDocument.title; replace sample data.
EOF
}

# Populate $dest with links into $root. When relative=1, use paths relative to each link.
# Intentionally omits package-lock from being *required* for discovery; still linked
# so agents can copy the scaffold. A real README.md (not a symlink) warns against npm install here.
link_skill() {
  dest=$1
  relative=${2:-0}

  rm -rf "$dest"
  mkdir -p "$dest"

  # Top-level paths (scaffold + docs). package.json is linked for *copy*, not for install-in-place.
  # Note: do not symlink `.gitignore` into the skill folder — the name collides
  # with git's ignore machinery. Agents copy it from the product root per scaffold-files.txt.
  for name in \
    SKILL.md \
    chart-book-spec.md \
    references \
    src \
    scripts \
    package.json \
    package-lock.json \
    index.html \
    vite.config.ts \
    tsconfig.json \
    public
  do
    if [ ! -e "$root/$name" ]; then
      continue
    fi
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

  write_skill_readme "$dest"
  write_scaffold_manifest "$dest"
}

linked=
if [ "$mode" = project ]; then
  dest="$cwd/.cursor/skills/databook"
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
if [ "$mode" = project ]; then
  echo "Project install cwd: $cwd"
fi
echo "Reminder: never npm install inside the skill folder — copy scaffold to the target book first."
