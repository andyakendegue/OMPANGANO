#!/usr/bin/env bash
# Refuse tout secret ou fichier sensible (règle S1 de SECURITE_ISO27001.md).
#   scripts/secrets_interdits.sh            fichiers indexés pour le commit (crochet pre-commit)
#   scripts/secrets_interdits.sh --tout     tous les fichiers versionnés
#   scripts/secrets_interdits.sh f1 f2…     fichiers donnés
set -uo pipefail
export LC_ALL=C
cd "$(git rev-parse --show-toplevel)"

MODE=index
if [ "${1:-}" = "--tout" ]; then MODE=tout; mapfile -t F < <(git ls-files)
elif [ $# -gt 0 ]; then MODE=fichiers; F=("$@")
else mapfile -t F < <(git diff --cached --name-only --diff-filter=ACMR); fi
[ ${#F[@]} -eq 0 ] && exit 0
bad=0

# 1. Fichiers qui ne doivent jamais être versionnés
NOMS='(^|/)(\.env(\.[a-z]+)?|google-services\.json|GoogleService-Info\.plist|firebase(\.config|-applet-config)\.json|[^/]*\.(pem|p12|p8|jks|keystore|key)|service-?account[^/]*\.json|id_(rsa|ed25519))$'
OK_NOMS='(^|/)\.env\.(example|production)$'
for f in "${F[@]}"; do
  if [[ "$f" =~ $NOMS ]] && ! [[ "$f" =~ $OK_NOMS ]]; then echo "INTERDIT (fichier sensible) : $f"; bad=1; fi
done

# 2. Motifs de secrets dans le contenu (clés Google/Firebase, Anthropic, OpenAI, AWS, clés privées, Slack, GitHub, Twilio, RunPod, JWT)
MOTIFS='AIza[0-9A-Za-z_-]{35}|sk-ant-[A-Za-z0-9_-]{20,}|sk-(proj-)?[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|xox[abprs]-[A-Za-z0-9-]{10,}|gh[pousr]_[A-Za-z0-9]{36}|\bAC[0-9a-f]{32}\b|\bSK[0-9a-f]{32}\b|rpa_[A-Za-z0-9]{30,}|eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.'
EXCLUS=(':!*package-lock.json' ':!*.lock')
case $MODE in
  tout)     trouve=$(git grep -IPno "$MOTIFS" -- . "${EXCLUS[@]}" 2>/dev/null) ;;
  index)    trouve=$(git grep --cached -IPno "$MOTIFS" -- "${F[@]}" "${EXCLUS[@]}" 2>/dev/null) ;;
  fichiers) trouve=$(grep -HIEno "$MOTIFS" "${F[@]}" 2>/dev/null) ;;
esac
if [ -n "$trouve" ]; then
  echo "INTERDIT (secret probable) :"
  # On n'affiche que les 8 premiers caractères du secret
  echo "$trouve" | sed -E 's/^(.*:[0-9]+):(.{8}).*/  \1 : \2…/' | head -20
  bad=1
fi

if [ $bad -ne 0 ]; then
  echo "Refusé : mettre le secret dans une variable d'environnement ou un fichier ignoré par git, puis le révoquer s'il a déjà été publié."
  exit 1
fi
