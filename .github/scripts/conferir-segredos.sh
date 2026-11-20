#!/usr/bin/env bash
#
# Confere que nenhum arquivo com segredo esta versionado.
#
# POR QUE ISTO EXISTE, E POR QUE NAO BASTA UM SCANNER
#
# O que este projeto arrisca vazar nao e chave de provedor: e senha de role do PostgreSQL,
# chave Base64 do JWT e hash BCrypt. Nada disso tem formato reconhecivel - o secret scanning
# nativo do GitHub e qualquer scanner de padroes de provedor passam por cima delas sem piscar.
#
# A defesa real e a convencao do .gitignore: "local no nome significa contem segredo". Ela ja
# falhou uma vez - cinco lacunas foram encontradas na conferencia de 2026-11-17, uma delas por
# um application-local.properties que passou batido no primeiro padrao. Entao o que este script
# confere e justamente a convencao, de dois lados:
#
#   A. Arquivo RASTREADO que o proprio .gitignore diz ignorar. E o caso do arquivo que entrou
#      antes de a regra existir: o .gitignore passa a cobri-lo, e o Git continua versionando,
#      em silencio, para sempre.
#
#   B. Nome com forma de segredo, mesmo que o .gitignore nao o cubra. Esta lista nao depende
#      do .gitignore de proposito: o furo de 2026-11-17 foi NO .gitignore, e uma conferencia
#      que so o consultasse teria aprovado o furo.
#
# COMO RODAR
#
#   .github/scripts/conferir-segredos.sh
#
# Sem argumento, sem saida em caso de sucesso alem de uma linha. Roda no CI e na maquina.

set -euo pipefail

# Padroes de nome com forma de segredo. Glob do shell, casados contra o caminho inteiro.
PADROES=(
  '*.local.*'
  '*-local.*'
  '.env'
  '.env.*'
  '*/.env'
  '*/.env.*'
  '*.hprof'
  'hs_err_pid*.log'
  '*/hs_err_pid*.log'
  'replay_pid*.log'
  '*/replay_pid*.log'
  '*.pem'
  '*.key'
  '*.p12'
  '*.jks'
  '*.keystore'
  'id_rsa'
  '*/id_rsa'
)

problema() {
  if [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "::error::$1"
  else
    echo "  $1"
  fi
}

achados=0

# A. Rastreado e ignorado ao mesmo tempo.
#
# O -i pede os ignorados; o -c limita aos que estao no indice. A intersecao dos dois e
# exatamente o arquivo que o .gitignore acha que resolveu e o Git continua versionando.
ignorados_e_rastreados=$(git ls-files -c -i --exclude-standard || true)
if [ -n "$ignorados_e_rastreados" ]; then
  while read -r caminho; do
    [ -n "$caminho" ] || continue
    problema "$caminho esta versionado E casa com o .gitignore"
    problema "  tire do indice com: git rm --cached \"$caminho\""
    achados=$((achados + 1))
  done <<< "$ignorados_e_rastreados"
fi

# B. Nome com forma de segredo, consultando so o indice.
rastreados=$(git ls-files)
while read -r caminho; do
  [ -n "$caminho" ] || continue
  for padrao in "${PADROES[@]}"; do
    # shellcheck disable=SC2053
    if [[ "$caminho" == $padrao ]]; then
      problema "$caminho esta versionado e tem nome de arquivo com segredo (casa com $padrao)"
      achados=$((achados + 1))
      break
    fi
  done
done <<< "$rastreados"

if [ "$achados" -gt 0 ]; then
  echo
  # Achados, nao arquivos: um mesmo caminho pode cair nas duas conferencias, e dizer
  # "4 arquivos" quando sao 3 seria errado.
  echo "$achados achado(s) no indice."
  echo "Tirar do indice NAO apaga o segredo do historico: se ja foi publicado, troque o valor."
  exit 1
fi

echo "Nenhum arquivo com forma de segredo no indice ($(printf '%s\n' "$rastreados" | wc -l | tr -d ' ') rastreados)."
