repo := justfile_directory()
home := env_var('HOME')

[private]
default:
    @just --list --unsorted

install: link-pi-agent link-skills link-ponytail link-rpiv-web-tools

link-pi-agent: (_link (repo + "/pi-agent") (home + "/.pi/agent"))

link-skills: (_link (repo + "/skills") (home + "/.agents/skills"))

link-ponytail: (_link (repo + "/ponytail.json") (home + "/.config/ponytail/config.json"))

link-rpiv-web-tools: (_link (repo + "/rpiv-web-tools.json") (home + "/.config/rpiv-web-tools/config.json"))

[private]
_link source target:
    #!/usr/bin/env bash
    set -euo pipefail

    if [[ ! -e "{{source}}" ]]; then
      echo "[error] source does not exist: {{source}}" >&2
      exit 1
    fi

    mkdir -p "$(dirname "{{target}}")" "$(dirname "{{source}}")"

    if [[ -L "{{target}}" && "$(readlink -f "{{target}}")" == "$(readlink -f "{{source}}")" ]]; then
      echo "[skip] {{target}}"
      exit 0
    fi

    if [[ -e "{{target}}" || -L "{{target}}" ]]; then
      mv "{{target}}" "{{target}}.backup.$(date +%Y%m%d%H%M%S)"
    fi

    ln -s "{{source}}" "{{target}}"
    echo "[link] {{target}} -> {{source}}"
