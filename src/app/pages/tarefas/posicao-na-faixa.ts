import { Tarefa } from '../../core/modelos';

/**
 * Traduz o lugar onde o card foi solto **na tela** para a posição **na faixa inteira**, que é
 * o que o `PATCH /api/tarefas/{id}/lugar` espera.
 *
 * <p>Os dois números só coincidem enquanto nada está escondido. Com as concluídas ocultas, ou
 * com um filtro de categoria, soltar na terceira linha da tela pode significar a sexta posição
 * da faixa. Até 2026-11-24 a saída era desligar o arrastar nesses casos; a partir daí, é esta
 * tradução — a "saída barata" registrada no `execucao.md`, que não muda a API.
 *
 * <p><b>A regra é ficar exato em relação aos vizinhos que a pessoa está vendo.</b> Soltar
 * antes de um card visível põe o arrastado imediatamente antes dele na faixa. Soltar no fim
 * da lista põe imediatamente depois do último visível. Os cards escondidos entre eles mantêm
 * a ordem relativa que já tinham.
 *
 * <p>A posição de cada card vem da resposta do servidor, que é sempre o índice na faixa
 * inteira — a tela filtra, mas não renumera.
 *
 * @param visiveisNoDestino os cards que a tela mostra na faixa de destino, **sem** o
 *                          arrastado, na ordem da tela. É a lista em que o `currentIndex` do
 *                          `cdk/drag-drop` é contado.
 * @param indiceNaTela      o `currentIndex` do evento de soltar.
 * @param posicaoDeOrigem   a posição do arrastado na faixa, quando o movimento é dentro da
 *                          mesma faixa; `null` quando vem de outra. Dentro da mesma faixa, o
 *                          servidor tira o card antes de reinseri-lo, e quem estava depois dele
 *                          sobe uma casa — por isso o ajuste.
 */
export function posicaoNaFaixa(
  visiveisNoDestino: readonly Tarefa[],
  indiceNaTela: number,
  posicaoDeOrigem: number | null,
): number {
  const depoisDeTirarOArrastado = (posicao: number): number =>
    posicaoDeOrigem !== null && posicao > posicaoDeOrigem ? posicao - 1 : posicao;

  if (indiceNaTela < visiveisNoDestino.length) {
    return depoisDeTirarOArrastado(visiveisNoDestino[indiceNaTela].posicao);
  }

  const ultimoVisivel = visiveisNoDestino.at(-1);
  if (ultimoVisivel) {
    return depoisDeTirarOArrastado(ultimoVisivel.posicao) + 1;
  }

  // Faixa sem nenhum card visível: o fim dela, que o servidor acomoda.
  return FIM_DA_FAIXA;
}

/**
 * "Depois do último", sem precisar saber quantos cards escondidos a faixa tem. O servidor
 * acomoda a posição além do fim (`FaixaDePrioridade.ajustarAoIntervalo`), e o valor cabe no
 * `Integer` do Java.
 */
export const FIM_DA_FAIXA = 2_147_483_647;
