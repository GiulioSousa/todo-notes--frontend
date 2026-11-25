import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { Categoria, GrupoDeCategoria, Tarefa } from '../../core/modelos';
import { Categorias, oQueAcontece } from './categorias';
import { FormularioDeCategoria } from './formulario-de-categoria';

/**
 * A frase que o diálogo de exclusão diz sobre as tarefas da categoria.
 *
 * <p>Tem teste porque **muda inteira com o número** — substantivo e os dois verbos —, e porque
 * erra em silêncio: ninguém vê a frase errada até estar prestes a apagar alguma coisa, que é o
 * pior momento para a interface parecer desleixada. O caso de uma tarefa é o mais comum de
 * todos: a categoria com uma tarefa só é a que se desiste de usar.
 *
 * <p>Os outros dois describes deste arquivo cobrem o resto da aba: a contagem que vem da
 * listagem agrupada e o diálogo que não fecha no `409`.
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

const CASA: Categoria = { id: 70, nome: 'Casa' };
const TRABALHO: Categoria = { id: 90, nome: 'Trabalho' };

let proximoId = 1;

function tarefa(): Tarefa {
  return {
    id: proximoId++,
    titulo: `t${proximoId}`,
    descricao: null,
    status: 'PENDENTE',
    prioridade: 'MEDIA',
    posicaoNaPrioridade: 0,
    posicaoNaCategoria: 0,
    categoria: null,
    criadaEm: '2026-11-25T00:00:00Z',
    dataConclusao: null,
  };
}

/**
 * A contagem que cada linha mostra, e de onde ela vem.
 *
 * <p>A aba **não** usa `GET /api/categorias`: a listagem agrupada por categoria já traz um
 * grupo por categoria cadastrada, com as tarefas dentro, e é dela que saem o nome e o tamanho.
 * Estes testes prendem as três consequências dessa escolha — o grupo das sem etiqueta tem de
 * ficar de fora, a categoria vazia tem de continuar na lista, e o filtro pedido tem de ser
 * `TODAS`.
 */
describe('a contagem de tarefas por categoria', () => {
  function criarTela(grupos: GrupoDeCategoria[]) {
    const listarTarefasPorCategoria = vi.fn().mockResolvedValue({ grupos });

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { listarTarefasPorCategoria } },
        { provide: MatDialog, useValue: {} },
      ],
    });

    return {
      tela: TestBed.runInInjectionContext(() => new Categorias()),
      listarTarefasPorCategoria,
    };
  }

  it('conta as tarefas de cada categoria', async () => {
    const { tela } = criarTela([
      { categoria: CASA, tarefas: [tarefa(), tarefa()] },
      { categoria: TRABALHO, tarefas: [tarefa()] },
      { categoria: null, tarefas: [tarefa(), tarefa(), tarefa()] },
    ]);

    await tela.carregar();

    expect(tela.categorias().map((linha) => [linha.categoria.nome, linha.tarefas])).toEqual([
      ['Casa', 2],
      ['Trabalho', 1],
    ]);
  });

  /**
   * O grupo das sem etiqueta é um grupo da **lista de tarefas**, não uma categoria. Deixá-lo
   * entrar poria na aba uma linha que não dá para renomear nem excluir.
   */
  it('deixa de fora o grupo das sem etiqueta', async () => {
    const { tela } = criarTela([
      { categoria: null, tarefas: [tarefa()] },
      { categoria: CASA, tarefas: [] },
    ]);

    await tela.carregar();

    expect(tela.categorias()).toHaveLength(1);
    expect(tela.categorias()[0].categoria).toEqual(CASA);
  });

  /** Categoria sem tarefa nenhuma continua na lista: é dela que se desiste, e é ela que some. */
  it('mantem a categoria vazia, com zero', async () => {
    const { tela } = criarTela([{ categoria: CASA, tarefas: [] }]);

    await tela.carregar();

    expect(tela.categorias()[0].tarefas).toBe(0);
  });

  /**
   * <b>Pede `TODAS` de propósito.</b> Com `PADRAO`, a preferência de ocultar concluídas
   * esconderia tarefas da contagem — e o aviso de exclusão diria um número menor do que o de
   * tarefas que vão perder a etiqueta.
   */
  it('pede TODAS: a contagem e o total, nao o que um filtro deixaria a vista', async () => {
    const { tela, listarTarefasPorCategoria } = criarTela([]);

    await tela.carregar();

    expect(listarTarefasPorCategoria).toHaveBeenCalledWith('TODAS');
  });

  it('falha na API vira mensagem na tela, e nao lista vazia sem explicacao', async () => {
    const listarTarefasPorCategoria = vi
      .fn()
      .mockRejectedValue(new HttpErrorResponse({ status: 0 }));

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { listarTarefasPorCategoria } },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const tela = TestBed.runInInjectionContext(() => new Categorias());

    await tela.carregar();

    expect(tela.erro()).toContain('Não foi possível falar com o servidor');
    expect(tela.carregando()).toBe(false);
  });
});

/**
 * O formulário da categoria, e a razão de ele mesmo chamar a API.
 *
 * <p>Nome repetido é `409`, erro **daquele campo**. Se o diálogo fechasse e a mensagem
 * aparecesse na tela de trás, a pessoa teria de reabrir o formulário e digitar tudo de novo
 * para corrigir o que acabou de escrever — que é o oposto de corrigir.
 */
describe('o formulario de categoria', () => {
  function criarFormulario(
    dados: { categoria?: Categoria },
    api: Partial<ApiService>,
  ) {
    const referencia = { close: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MatDialogRef, useValue: referencia },
        { provide: MAT_DIALOG_DATA, useValue: dados },
      ],
    });

    return {
      formulario: TestBed.runInInjectionContext(() => new FormularioDeCategoria()),
      referencia,
    };
  }

  const duplicada = () =>
    new HttpErrorResponse({
      status: 409,
      error: { mensagem: 'Já existe uma categoria chamada "casa"' },
    });

  it('no 409, mostra a mensagem do servidor e NAO fecha', async () => {
    const criarCategoria = vi.fn().mockRejectedValue(duplicada());
    const { formulario, referencia } = criarFormulario({}, { criarCategoria } as never);

    formulario.formulario.controls.nome.setValue('casa');
    await formulario.salvar();

    expect(referencia.close).not.toHaveBeenCalled();
    expect(formulario.erro()).toBe('Já existe uma categoria chamada "casa"');
    // Destravado: a pessoa corrige o nome e tenta de novo sem fechar nada.
    expect(formulario.salvando()).toBe(false);
  });

  it('ao salvar, fecha devolvendo a categoria gravada', async () => {
    const criarCategoria = vi.fn().mockResolvedValue(CASA);
    const { formulario, referencia } = criarFormulario({}, { criarCategoria } as never);

    formulario.formulario.controls.nome.setValue('  Casa  ');
    await formulario.salvar();

    // O nome vai sem os espaços das pontas: a CHECK da tabela recusa texto não aparado.
    expect(criarCategoria).toHaveBeenCalledWith('Casa');
    expect(referencia.close).toHaveBeenCalledWith(CASA);
  });

  it('com categoria nos dados, renomeia em vez de criar', async () => {
    const renomearCategoria = vi.fn().mockResolvedValue({ ...CASA, nome: 'Lar' });
    const criarCategoria = vi.fn();
    const { formulario, referencia } = criarFormulario(
      { categoria: CASA },
      { renomearCategoria, criarCategoria } as never,
    );

    // O campo nasce com o nome de hoje: renomear é corrigir, não digitar do zero.
    expect(formulario.formulario.controls.nome.value).toBe('Casa');

    formulario.formulario.controls.nome.setValue('Lar');
    await formulario.salvar();

    expect(renomearCategoria).toHaveBeenCalledWith(CASA.id, 'Lar');
    expect(criarCategoria).not.toHaveBeenCalled();
    expect(referencia.close).toHaveBeenCalled();
  });

  it('nome vazio nao chega a chamar a API', async () => {
    const criarCategoria = vi.fn();
    const { formulario, referencia } = criarFormulario({}, { criarCategoria } as never);

    formulario.formulario.controls.nome.setValue('   ');
    await formulario.salvar();

    expect(criarCategoria).not.toHaveBeenCalled();
    expect(referencia.close).not.toHaveBeenCalled();
  });
});
