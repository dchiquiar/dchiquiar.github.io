#!/usr/bin/env bash
# Falla si contenido interno quedó expuesto en el repo público, de dos formas
# distintas:
#   1) por NOMBRE DE ARCHIVO — el vault, la config y memoria de agentes en
#      .claude/, o la capa privada del CV (teléfono, nombres reales de
#      empleadores) trackeados por git.
#   2) por CONTENIDO — un archivo público (ej. un .mjs o .astro) que en un
#      comentario o string MENCIONA el vault, una ruta absoluta de la máquina
#      de Diego, o el nombre de un documento interno, aunque el archivo en sí
#      no tenga que estar excluido. Esto ya pasó tres veces sin que (1) lo
#      detectara: TODOs con rutas del vault dentro de valores YAML, una nota
#      de auditoría filtrada a un campo público, y comentarios de código que
#      citaban rutas del vault.
#
# El repo es público — esto corre en CI antes de cada deploy, y se puede
# correr a mano antes de publicar cualquier cosa.
#
# A propósito este script NO busca nombres de empleadores (ni "Tecnisegur" ni
# "Advansys" ni ningún otro): para buscarlos habría que escribirlos ACÁ, y
# este script es público — se convertiría él mismo en la fuga que intenta
# prevenir. Esa verificación se hace a mano, revisando el contenido antes de
# publicarlo, no en este gate.
set -uo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "AVISO: todavía no hay repo git. Nada que verificar."
  exit 0
fi

# --- 1) Fuga por NOMBRE DE ARCHIVO ------------------------------------------

leaked=$(git ls-files | grep -E '^(vault/|_templates/|archive/|0[0-6]-|\.claude/|data/private/)' || true)

if [ -n "$leaked" ]; then
  echo "ERROR: contenido interno trackeado por git. NO publicar."
  echo "$leaked"
  exit 1
fi

echo "OK: no hay contenido interno trackeado por git (nombre de archivo)."

# --- 2) Fuga por CONTENIDO ---------------------------------------------------
#
# Recorre el CONTENIDO de los archivos trackeados (no sólo sus nombres) en
# busca de texto que revele estructura interna. `git grep -I` ya excluye los
# archivos que git detecta como binarios (las imágenes de public/projects/,
# etc.), así que no hace falta una lista de extensiones aparte.
#
# Excepciones por PAR (patrón, archivo) — no por archivo completo. Un archivo
# exento de todos los patrones deja de estar cubierto por este chequeo para
# siempre, aunque el día de mañana le agreguen una línea que sí filtre algo.
# Cada archivo está exento SÓLO del patrón puntual que necesita citar para
# cumplir su propio rol (documentar la regla de exclusión o implementar el
# propio chequeo), con su motivo al lado.
#
# Criterio para decidir si algo entra en esta lista: mencionar que existe un
# directorio privado excluido del repo es inevitable y está bien — es lo que
# ya dice el propio .gitignore, información honesta sobre la forma del repo.
# Citar un ARCHIVO CONCRETO de adentro (un log, una nota, una ficha) es otra
# cosa: es un índice de algo que nadie puede abrir. Esta lista blanca cubre
# sólo lo primero.

content_labels=(
  "referencia a vault/"
  "ruta absoluta de usuario (Windows)"
  "ruta absoluta de usuario (home Linux)"
  "ruta absoluta de usuario (home macOS)"
  "nombre de documento interno"
  "marcador de pregunta pendiente (<<PREGUNTA)"
)

content_regexes=(
  'vault/'
  'C:[/\\]Users[/\\]'
  '/home/[^/[:space:]]+/'
  '/Users/[^/[:space:]]+/'
  'datos-diego|revision-cv|perfil-objetivo|recomendaciones\.md|fichas-proyectos|cv-final-'
  '<<PREGUNTA'
)

# Lista de archivos exentos por índice (mismo orden que los dos arrays de
# arriba), separados por coma; "" si ningún archivo necesita excepción para
# ese patrón. El motivo de cada uno va en el comentario de su línea.
content_exempt_files=(
  ".gitignore,.github/workflows/deploy.yml,scripts/check-repo-leak.sh"  # los tres describen la regla de exclusión (qué se excluye y por qué); ninguno cita un archivo concreto de adentro del vault
  ""                                                                    # ningún archivo público necesita citar una ruta de usuario Windows
  "scripts/check-repo-leak.sh"                                         # el patrón que este chequeo busca queda escrito, literal, en el propio script
  "scripts/check-repo-leak.sh"                                         # ídem: el patrón que busca este chequeo queda escrito en el script
  "scripts/check-repo-leak.sh"                                         # la etiqueta de este chequeo (el nombre del patrón) queda escrita en el script
  "scripts/check-repo-leak.sh,src/lib/content.js"                      # check-repo-leak.sh: el patrón que busca queda escrito en el script. content.js: PLACEHOLDER_RE detecta ese marcador en datos sin confirmar, no lo tiene como fuga
)

content_leak=0
for i in "${!content_regexes[@]}"; do
  label="${content_labels[$i]}"
  regex="${content_regexes[$i]}"
  exempt="${content_exempt_files[$i]}"

  exclude_pathspecs=()
  if [ -n "$exempt" ]; then
    IFS=',' read -ra exempt_arr <<< "$exempt"
    for f in "${exempt_arr[@]}"; do
      exclude_pathspecs+=(":(exclude)$f")
    done
  fi

  matches=$(git grep -n -I -E "$regex" -- . "${exclude_pathspecs[@]}" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "ERROR: contenido interno filtrado en archivos trackeados ($label). NO publicar."
    echo "$matches"
    content_leak=1
  fi
done

if [ "$content_leak" -eq 1 ]; then
  exit 1
fi

echo "OK: no hay contenido interno filtrado en archivos trackeados (contenido)."
