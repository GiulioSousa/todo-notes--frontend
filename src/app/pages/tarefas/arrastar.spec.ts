import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { Categoria, Faixa, GrupoDeCategoria, Prioridade, Tarefa } from '../../core/modelos';
import { FIM_DO_GRUPO, posicaoDoModo, posicaoNoGrupo } from './posicao-no-grupo';
import {
  CHAVE_DO_FILTRO,
  CHAVE_DO_MODO,
  filtroGravado,
  grupoDaCategoria,
  grupoDaFaixa,
  GrupoNaTela,
  modoGravado,
  Tarefas,
} from './tarefas';

/**
 * O arrastar com cards escondidos, nos dois modos de visualização.
 *
 * <p>Até 2026-11-24, esconder qualquer card desligava o arrastar, porque o índice na tela
 * deixava de ser a posição no grupo. Desde então ele vale com qualquer filtro, e quem
 * reconcilia os dois números é {@link posicaoNoGrupo}. Estes testes prendem a tradução, o que
 * a tela faz com a resposta do servidor — que vem inteira, sem filtro — e, desde 2026-11-25,
 * <b>qual das duas ordens cada modo reescreve</b>.
 */

let proximoId = 1;

const NA_PRIORIDADE = posicaoDoModo('PRIORIDADE');
const NA_CATEGORIA = posicaoDoModo('CATEGORIA');

const CASA: Categoria = { id: 70, nome: 'Casa' };
const TRABALHO: Categoria = { id: 90, nome: 'Trabalho' };

function tarefa(posicao: number, extras: Partial<Tarefa> = {}): Tarefa {
  return {
    id: proximoId++,
    titulo: `t${posicao}`,
    descricao: null,
    status: 'PENDENTE',
    prioridade: 'MEDIA',
    posicaoNaPrioridade: posicao,
    posicaoNaCategoria: posicao,
    categoria: null,
    criadaEm: '2026-11-24T00:00:00Z',
    dataConclusao: null,
    ...extras,
  };
}

describe('posicaoNoGrupo', () => {
  // O grupo inteiro: A0 B1 C2 D3, com C concluída e escondida. A tela mostra A, B e D.
  const a = tarefa(0);
  const b = tarefa(1);
  const d = tarefa(3);

  it('com tudo visivel, e o proprio indice da tela', () => {
    const c = tarefa(2);
    // Arrastar A para o lugar de C: sem A, a tela mostra B C D, e soltar no índice 1 é antes de C.
    expect(posicaoNoGrupo([b, c, d], 1, 0, NA_PRIORIDADE)).toBe(1);
  });

  it('soltar antes de um card visivel poe o arrastado logo antes dele', () => {
    // Arrastar A para antes de D. Sem A, a tela mostra B D; D estava em 3, e com A fora sobe
    // para 2. Inserir em 2 deixa B C A D: A imediatamente antes de D, e C no lugar dele.
    expect(posicaoNoGrupo([b, d], 1, 0, NA_PRIORIDADE)).toBe(2);
  });

  it('soltar no fim da tela poe o arrastado logo depois do ultimo visivel', () => {
    // Arrastar A para o fim: depois de D, que com A fora fica em 2. A vai para 3.
    expect(posicaoNoGrupo([b, d], 2, 0, NA_PRIORIDADE)).toBe(3);
  });

  it('subir no grupo nao precisa de ajuste: quem esta antes da origem nao se move', () => {
    // Arrastar D para o topo: sem D, a tela mostra A B. Soltar no 0 é antes de A.
    expect(posicaoNoGrupo([a, b], 0, 3, NA_PRIORIDADE)).toBe(0);
  });

  it('vindo de outro grupo, a posicao do vizinho vale como esta', () => {
    // Nada sai do grupo de destino, então ninguém sobe uma casa.
    expect(posicaoNoGrupo([a, b, d], 2, null, NA_PRIORIDADE)).toBe(3);
    expect(posicaoNoGrupo([a, b, d], 3, null, NA_PRIORIDADE)).toBe(4);
  });

  it('grupo sem card visivel recebe no fim, e o servidor acomoda', () => {
    expect(posicaoNoGrupo([], 0, null, NA_PRIORIDADE)).toBe(FIM_DO_GRUPO);
  });

  it('o fim do grupo cabe no Integer do Java', () => {
    expect(FIM_DO_GRUPO).toBe(2 ** 31 - 1);
  });

  /**
   * <b>A tradução lê a ordem do modo em que se está arrastando.</b> Ler a outra não quebra
   * nada na hora: só põe o card num lugar que a pessoa não escolheu.
   */
  it('cada modo le a sua propria posicao', () => {
    const cruzada = tarefa(0, { posicaoNaPrioridade: 5, posicaoNaCategoria: 2 });

    expect(posicaoNoGrupo([cruzada], 0, null, NA_PRIORIDADE)).toBe(5);
    expect(posicaoNoGrupo([cruzada], 0, null, NA_CATEGORIA)).toBe(2);
  });
});

describe('escolhas gravadas no navegador', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sem escolha gravada, oculta as concluidas', () => {
    expect(filtroGravado()).toBe('NENHUMA');
  });

  it('lembra a escolha gravada', () => {
    localStorage.setItem(CHAVE_DO_FILTRO, 'TODAS');

    expect(filtroGravado()).toBe('TODAS');
  });

  it('ignora valor estranho no armazenamento', () => {
    localStorage.setItem(CHAVE_DO_FILTRO, 'qualquer-coisa');

    expect(filtroGravado()).toBe('NENHUMA');
  });

  it('sem armazenamento disponivel, fica no inicial', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(filtroGravado()).toBe('NENHUMA');
    expect(modoGravado()).toBe('PRIORIDADE');
  });

  it('sem modo gravado, agrupa por prioridade: e o que a lista era antes de haver escolha', () => {
    expect(modoGravado()).toBe('PRIORIDADE');
  });

  it('lembra o modo gravado', () => {
    localStorage.setItem(CHAVE_DO_MODO, 'CATEGORIA');

    expect(modoGravado()).toBe('CATEGORIA');
  });

  it('ignora modo estranho no armazenamento', () => {
    localStorage.setItem(CHAVE_DO_MODO, 'POR_COR');

    expect(modoGravado()).toBe('PRIORIDADE');
  });
});

describe('soltar', () => {
  /**
   * O componente é construído à mão, sem desenhar o template: o `ngOnInit` não roda, e as
   * únicas chamadas à API são as do arrastar, falsificadas.
   */
  function criarTela(resposta: { faixas?: Faixa[]; grupos?: GrupoDeCategoria[] }) {
    const moverTarefa = vi.fn().mockResolvedValue({ faixas: resposta.faixas ?? [] });
    const moverTarefaNaCategoria = vi.fn().mockResolvedValue({ grupos: resposta.grupos ?? [] });
    const listarTarefas = vi.fn().mockResolvedValue({ faixas: [] });
    const listarTarefasPorCategoria = vi.fn().mockResolvedValue({ grupos: [] });
    const listarCategorias = vi.fn().mockResolvedValue([]);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ApiService,
          useValue: {
            moverTarefa,
            moverTarefaNaCategoria,
            listarTarefas,
            listarTarefasPorCategoria,
            listarCategorias,
          },
        },
        { provide: MatDialog, useValue: {} },
      ],
    });

    return {
      tela: TestBed.runInInjectionContext(() => new Tarefas()),
      moverTarefa,
      moverTarefaNaCategoria,
    };
  }

  function evento(
    origem: GrupoNaTela,
    destino: GrupoNaTela,
    arrastada: Tarefa,
    previousIndex: number,
    currentIndex: number,
  ): CdkDragDrop<GrupoNaTela> {
    // O mesmo objeto nos dois lados quando o grupo é o mesmo: é por identidade de container
    // que o componente distingue mover dentro do grupo de mover entre grupos, como o CDK faz.
    const container = { data: origem };
    return {
      previousContainer: container,
      container: origem === destino ? container : { data: destino },
      item: { data: arrastada },
      previousIndex,
      currentIndex,
    } as unknown as CdkDragDrop<GrupoNaTela>;
  }

  function faixas(media: Tarefa[]): Faixa[] {
    return (['ALTA', 'MEDIA', 'BAIXA'] as Prioridade[]).map((prioridade) => ({
      prioridade,
      tarefas: prioridade === 'MEDIA' ? media : [],
    }));
  }

  it('manda a posicao na faixa e nao traz de volta a concluida escondida', async () => {
    const a = tarefa(0);
    const b = tarefa(1);
    const c = tarefa(2, { status: 'CONCLUIDA', dataConclusao: '2026-11-24T10:00:00Z' });
    const d = tarefa(3);

    // O que o servidor devolve depois de mover A para antes de D: a faixa INTEIRA.
    const resposta: Faixa[] = [
      {
        prioridade: 'MEDIA',
        tarefas: [
          { ...b, posicaoNaPrioridade: 0 },
          { ...c, posicaoNaPrioridade: 1 },
          { ...a, posicaoNaPrioridade: 2 },
          { ...d, posicaoNaPrioridade: 3 },
        ],
      },
    ];
    const { tela, moverTarefa } = criarTela({ faixas: resposta });

    // A tela mostra A B D: C está oculta.
    tela.grupos.set(faixas([a, b, d]).map(grupoDaFaixa));
    const media = tela.grupos()[1];

    // Arrastar A (índice 0 na tela) para antes de D (índice 1 depois de A sair).
    await tela.soltar(evento(media, media, a, 0, 1));

    expect(moverTarefa).toHaveBeenCalledWith(a.id, { prioridade: 'MEDIA', posicao: 2 });

    const naTela = tela.grupos()[1].tarefas;
    expect(naTela.map((t) => t.id)).toEqual([b.id, a.id, d.id]);
    // As posições novas vêm do servidor, e são elas que o próximo arrastar vai usar.
    expect(naTela.map((t) => t.posicaoNaPrioridade)).toEqual([0, 2, 3]);
  });

  /**
   * <b>No modo por categoria, o arrastar vai para a outra rota</b> — e leva a categoria de
   * destino, que é o que troca a etiqueta do card. Mandar a prioridade aqui reescreveria a
   * ordem errada, e em silêncio: a tela mostraria o card no lugar certo até alguém recarregar.
   */
  it('no modo por categoria, manda a categoria de destino e a posicao no grupo', async () => {
    const daCasa = tarefa(0, { categoria: CASA });
    const outraDaCasa = tarefa(1, { categoria: CASA });
    const doTrabalho = tarefa(0, { categoria: TRABALHO });

    const { tela, moverTarefa, moverTarefaNaCategoria } = criarTela({
      grupos: [
        { categoria: CASA, tarefas: [outraDaCasa] },
        { categoria: TRABALHO, tarefas: [daCasa, doTrabalho] },
      ],
    });

    tela.modo.set('CATEGORIA');
    tela.grupos.set(
      [
        { categoria: CASA, tarefas: [daCasa, outraDaCasa] },
        { categoria: TRABALHO, tarefas: [doTrabalho] },
      ].map(grupoDaCategoria),
    );
    const [casa, trabalho] = tela.grupos();

    // Arrastar a primeira da Casa para o topo do Trabalho.
    await tela.soltar(evento(casa, trabalho, daCasa, 0, 0));

    expect(moverTarefa).not.toHaveBeenCalled();
    expect(moverTarefaNaCategoria).toHaveBeenCalledWith(daCasa.id, {
      categoriaId: TRABALHO.id,
      posicao: 0,
    });
    expect(tela.grupos().map((grupo) => grupo.tarefas.map((t) => t.id))).toEqual([
      [outraDaCasa.id],
      [daCasa.id, doTrabalho.id],
    ]);
  });

  /** Soltar no grupo das sem etiqueta tira a etiqueta: a categoria nula é um destino. */
  it('no grupo sem etiqueta, manda categoriaId nulo', async () => {
    const daCasa = tarefa(0, { categoria: CASA });

    const { tela, moverTarefaNaCategoria } = criarTela({
      grupos: [{ categoria: null, tarefas: [{ ...daCasa, categoria: null }] }],
    });

    tela.modo.set('CATEGORIA');
    tela.grupos.set(
      [
        { categoria: CASA, tarefas: [daCasa] },
        { categoria: null, tarefas: [] },
      ].map(grupoDaCategoria),
    );
    const [casa, semEtiqueta] = tela.grupos();

    await tela.soltar(evento(casa, semEtiqueta, daCasa, 0, 0));

    expect(moverTarefaNaCategoria).toHaveBeenCalledWith(daCasa.id, {
      categoriaId: null,
      posicao: FIM_DO_GRUPO,
    });
  });
});
