import { oQueAcontece } from './categorias';

/**
 * A frase que o diálogo de exclusão diz sobre as tarefas da categoria.
 *
 * <p>Tem teste porque **muda inteira com o número** — substantivo e os dois verbos —, e porque
 * erra em silêncio: ninguém vê a frase errada até estar prestes a apagar alguma coisa, que é o
 * pior momento para a interface parecer desleixada. O caso de uma tarefa é o mais comum de
 * todos: a categoria com uma tarefa só é a que se desiste de usar.
 *
 * <p>O que está testado é a função pura. O resto da aba — a contagem que vem da listagem
 * agrupada e o diálogo que não fecha no `409` — foi conferido no navegador em 2026-11-25, e
 * continua sem teste automatizado.
 */
describe('o aviso de exclusão de categoria', () => {
  it('sem tarefa nenhuma, não fala em perder etiqueta', () => {
    expect(oQueAcontece(0)).toBe('Nenhuma tarefa usa esta etiqueta.');
  });

  it('com uma tarefa, concorda no singular', () => {
    expect(oQueAcontece(1)).toBe(
      '1 tarefa perde a etiqueta e passa para "Sem categoria". Nenhuma tarefa é apagada.',
    );
  });

  it('com mais de uma, concorda no plural', () => {
    expect(oQueAcontece(3)).toBe(
      '3 tarefas perdem a etiqueta e passam para "Sem categoria". Nenhuma tarefa é apagada.',
    );
  });

  /**
   * O diálogo diz "apagada definitivamente" na frase anterior, falando da **categoria**. Sem
   * esta, a pessoa pode entender que as tarefas vão junto — e elas não vão.
   */
  it('sempre que há tarefas, diz que nenhuma é apagada', () => {
    for (const quantas of [1, 2, 17]) {
      expect(oQueAcontece(quantas)).toContain('Nenhuma tarefa é apagada.');
      expect(oQueAcontece(quantas)).toContain('"Sem categoria"');
    }
  });
});
