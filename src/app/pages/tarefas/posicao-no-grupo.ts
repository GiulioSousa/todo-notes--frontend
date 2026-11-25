import { ModoDeVisualizacao, Tarefa } from '../../core/modelos';

/**
 * Traduz o lugar onde o card foi solto **na tela** para a posição **no grupo inteiro**, que é
 * o que o `PATCH /api/tarefas/{id}/lugar` e o `/lugar-na-categoria` esperam.
 *
 * <p>Os dois números só coincidem enquanto nada está escondido. Com as concluídas ocultas, ou
 * com um filtro de categoria, soltar na terceira linha da tela pode significar a sexta posição
 * do grupo. Até 2026-11-24 a saída era desligar o arrastar nesses casos; a partir daí, é esta
 * tradução — a "saída barata" registrada no `execucao.md`, que não muda a API.
 *
 * <p><b>A regra é ficar exato em relação aos vizinhos que a pessoa está vendo.</b> Soltar
 * antes de um card visível põe o arrastado imediatamente antes dele no grupo. Soltar no fim
 * da lista põe imediatamente depois do último visível. Os cards escondidos entre eles mantêm
 * a ordem relativa que já tinham.
 *
 * <p>A posição de cada card vem da resposta do servidor, que é sempre o índice no grupo
 * inteiro — a tela filtra, mas não renumera.
 *
 * <p><b>Serve aos dois modos de visualização</b>, e é a {@link posicaoDoModo} que diz qual das
 * duas posições do card ler. A regra é a mesma nos dois: o que muda é de qual ordem se fala.
 *
 * @param visiveisNoDestino os cards que a tela mostra no grupo de destino, **sem** o
 *                          arrastado, na ordem da tela. É a lista em que o `currentIndex` do
 *                          `cdk/drag-drop` é contado.
 * @param indiceNaTela      o `currentIndex` do evento de soltar.
 * @param posicaoDeOrigem   a posição do arrastado no grupo, quando o movimento é dentro do
 *                          mesmo grupo; `null` quando vem de outro. Dentro do mesmo grupo, o
 *                          servidor tira o card antes de reinseri-lo, e quem estava depois dele
 *                          sobe uma casa — por isso o ajuste.
 * @param posicao           de qual das duas ordens do card se trata.
 */
export function posicaoNoGrupo(
  visiveisNoDestino: readonly Tarefa[],
  indiceNaTela: number,
  posicaoDeOrigem: number | null,
  posicao: (tarefa: Tarefa) => number,
): number {
  const depoisDeTirarOArrastado = (lugar: number): number =>
    posicaoDeOrigem !== null && lugar > posicaoDeOrigem ? lugar - 1 : lugar;

  if (indiceNaTela < visiveisNoDestino.length) {
    return depoisDeTirarOArrastado(posicao(visiveisNoDestino[indiceNaTela]));
  }

  const ultimoVisivel = visiveisNoDestino.at(-1);
  if (ultimoVisivel) {
    return depoisDeTirarOArrastado(posicao(ultimoVisivel)) + 1;
  }

  // Grupo sem nenhum card visível: o fim dele, que o servidor acomoda.
  return FIM_DO_GRUPO;
}

/**
 * Qual das duas posições do card o modo lê.
 *
 * <p>Existe para que nenhum outro arquivo precise repetir este `if`. Ler a posição errada não
 * quebra nada na hora: só põe o card num lugar que a pessoa não escolheu, no grupo certo.
 */
export function posicaoDoModo(modo: ModoDeVisualizacao): (tarefa: Tarefa) => number {
  return modo === 'PRIORIDADE'
    ? (tarefa) => tarefa.posicaoNaPrioridade
    : (tarefa) => tarefa.posicaoNaCategoria;
}

/**
 * "Depois do último", sem precisar saber quantos cards escondidos o grupo tem. O servidor
 * acomoda a posição além do fim (`GrupoDeTarefas.ajustarAoIntervalo`), e o valor cabe no
 * `Integer` do Java.
 */
export const FIM_DO_GRUPO = 2_147_483_647;
