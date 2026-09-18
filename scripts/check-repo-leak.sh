#!/usr/bin/env bash
# Falla si contenido interno quedó trackeado por git: el vault, la config y
# memoria de agentes en .claude/, o la capa privada del CV (teléfono,
# nombres reales de empleadores). El repo es público — esto corre en CI
# antes de cada deploy, y se puede correr a mano antes de publicar cualquier
# cosa.
set -uo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "AVISO: todavía no hay repo git. Nada que verificar."
  exit 0
fi

leaked=$(git ls-files | grep -E '^(vault/|_templates/|archive/|0[0-6]-|\.claude/|data/private/)' || true)

if [ -n "$leaked" ]; then
  echo "ERROR: contenido interno trackeado por git. NO publicar."
  echo "$leaked"
  exit 1
fi

echo "OK: no hay contenido interno trackeado por git."
