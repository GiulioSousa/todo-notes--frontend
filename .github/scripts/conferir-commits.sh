#!/usr/bin/env bash
#
# Confere as mensagens de commit contra a Secao 9 do ESPECIFICACOES.md.
#
# POR QUE ISTO EXISTE
#
# O release-please monta o CHANGELOG e decide a versao a partir das mensagens de commit.
# Commit fora da convencao nao quebra nada: ele simplesmente SOME do historico publicado,
# sem aviso. Este script transforma esse silencio em falha de CI, enquanto a mensagem ainda
# pode ser corrigida.
#
# COMO RODAR
#
#   .github/scripts/conferir-commits.sh                  # todo o historico (uso local)
#   .github/scripts/conferir-commits.sh origin/main..HEAD # um intervalo
#
# Em pull request, sem argumento, ele deduz o intervalo de GITHUB_BASE_REF: so os commits
# que o PR traz. O historico ja aceito nao e reavaliado a cada execucao.
#
# O QUE ELE CONFERE
#
#   1. Conventional Commits 1.0.0: <tipo>[(escopo)][!]: <descricao>
#   2. Tipo entre os onze da convencao
#   3. Escopo, quando houver, na lista de escopos-de-commit.txt (bounded context, nao camada)
#   4. Descricao comecando em minuscula e sem ponto final
#   5. Assunto so em ASCII - o corpo pode ter acento, o assunto nao
#   6. Nenhuma linha de coautoria, em commit nenhum
#
# Os itens 5 e 6 sao os dois que mais aparecem na pratica: o acento entra sem querer ao
# escrever em portugues, e a coautoria entra por ferramenta.
#
# NAO ha limite de tamanho do assunto. A Secao 9 nao pede um, e o Dependabot abriria PR
# reprovado so por nomear a dependencia inteira ("bump org.springframework.boot:
# spring-boot-starter-parent from 4.1.2 to 4.1.3" passa de 70 caracteres sozinho).

set -euo pipefail

TIPOS='feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARQUIVO_DE_ESCOPOS="$AQUI/escopos-de-commit.txt"

if [ ! -f "$ARQUIVO_DE_ESCOPOS" ]; then
  echo "ERRO: nao encontrei $ARQUIVO_DE_ESCOPOS" >&2
  exit 2
fi

# Linhas em branco e comentarios saem; o resto e a lista de escopos aceitos.
ESCOPOS=$(grep -vE '^[[:space:]]*(#|$)' "$ARQUIVO_DE_ESCOPOS" | tr -d '\r')

intervalo="${1:-}"
if [ -z "$intervalo" ]; then
  if [ -n "${GITHUB_BASE_REF:-}" ]; then
    intervalo="origin/${GITHUB_BASE_REF}..HEAD"
  else
    intervalo="HEAD"
  fi
fi

# Anotacao do GitHub quando roda no CI, linha comum quando roda na maquina.
problema() {
  if [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "::error::$1"
  else
    echo "  $1"
  fi
}

commits=$(git log --no-merges --format=%H "$intervalo")

if [ -z "$commits" ]; then
  echo "Nenhum commit para conferir em $intervalo."
  exit 0
fi

total=0
reprovados=0

while read -r sha; do
  [ -n "$sha" ] || continue
  total=$((total + 1))

  curto=$(git rev-parse --short "$sha")
  assunto=$(git show -s --format=%s "$sha")
  mensagem=$(git show -s --format=%B "$sha")
  falhou=0

  if ! printf '%s' "$assunto" | grep -qE "^($TIPOS)(\([a-z0-9-]+\))?!?: [a-z].*$"; then
    problema "$curto fora da convencao: \"$assunto\""
    problema "  esperado <tipo>[(escopo)][!]: <descricao em minuscula>, tipo entre: $(echo "$TIPOS" | tr '|' ' ')"
    falhou=1
  else
    if printf '%s' "$assunto" | grep -qE "^($TIPOS)\("; then
      escopo=$(printf '%s' "$assunto" | sed -E "s/^($TIPOS)\(([a-z0-9-]+)\).*/\2/")
      if ! printf '%s\n' "$ESCOPOS" | grep -qxF "$escopo"; then
        problema "$curto usa o escopo \"$escopo\", que nao esta em escopos-de-commit.txt"
        problema "  aceitos: $(printf '%s' "$ESCOPOS" | tr '\n' ' ')"
        falhou=1
      fi
    fi

    case "$assunto" in
      *.)
        problema "$curto termina em ponto: \"$assunto\""
        falhou=1
        ;;
    esac
  fi

  if printf '%s' "$assunto" | LC_ALL=C grep -q '[^ -~]'; then
    problema "$curto tem caractere fora do ASCII no assunto: \"$assunto\""
    problema "  o corpo do commit pode ter acento; o assunto, nao"
    falhou=1
  fi

  if printf '%s' "$mensagem" | grep -qiE '^co-authored-by:'; then
    problema "$curto leva linha de coautoria, que a Secao 9 proibe"
    falhou=1
  fi

  [ "$falhou" -eq 0 ] || reprovados=$((reprovados + 1))
done <<< "$commits"

if [ "$reprovados" -gt 0 ]; then
  echo
  echo "$reprovados de $total commit(s) fora da convencao em $intervalo."
  echo "Corrija com git commit --amend (o ultimo) ou git rebase -i (os anteriores)."
  exit 1
fi

echo "$total commit(s) conferido(s) em $intervalo: todos dentro da convencao."
