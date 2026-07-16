repo := justfile_directory()
home := env_var('HOME')

default:
    @just --list --unsorted

install: link-pi-agent link-skills

link-pi-agent: (_link (repo + "/pi-agent") (home + "/.pi/agent"))

link-skills: (_link (repo + "/skills") (home + "/.agents/skills"))

[private]
_link source target:
    #!/usr/bin/env bash
    set -euo pipefail

    mkdir -p "$(dirname "{{target}}")" "{{source}}"

    if [[ -L "{{target}}" && "$(readlink -f "{{target}}")" == "$(readlink -f "{{source}}")" ]]; then
      echo "[skip] {{target}}"
      exit 0
    fi

    if [[ -e "{{target}}" || -L "{{target}}" ]]; then
      mv "{{target}}" "{{target}}.backup.$(date +%Y%m%d%H%M%S)"
    fi

    ln -s "{{source}}" "{{target}}"
    echo "[link] {{target}} -> {{source}}"
