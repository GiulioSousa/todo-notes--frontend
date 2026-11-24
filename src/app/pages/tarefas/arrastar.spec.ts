import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { Faixa, Prioridade, Tarefa } from '../../core/modelos';
import { FIM_DA_FAIXA, posicaoNaFaixa } from './posicao-na-faixa';
import { CHAVE_DO_FILTRO, filtroGravado, Tarefas } from './tarefas';

/**
 * O arrastar com cards escondidos.
 *
 * <p>Até 2026-11-24, esconder qualquer card desligava o arrastar, porque o índice na tela
 * deixava de ser a posição na faixa. Desde então ele vale com qualquer filtro, e quem
 * reconcilia os dois números é {@link posicaoNaFaixa}. Estes testes prendem a tradução e o
 * que a tela faz com a resposta do servidor — que vem inteira, sem filtro.
 */

let proximoId = 1;

function tarefa(posicao: number, extras: Partial<Tarefa> = {}): Tarefa {
  return {
    id: proximoId++,
    titulo: `t${posicao}`,
    descricao: null,
    status: 'PENDENTE',
    prioridade: 'MEDIA',
    posicao,
    categoria: null,
    criadaEm: '2026-11-24T00:00:00Z',
    dataConclusao: null,
    ...extras,
  };
}

describe('posicaoNaFaixa', () => {
  // A faixa inteira: A0 B1 C2 D3, com C concluída e escondida. A tela mostra A, B e D.
  const a = tarefa(0);
  const b = tarefa(1);
  const d = tarefa(3);

  it('com tudo visivel, e o proprio indice da tela', () => {
    const c = tarefa(2);
    // Arrastar A para o lugar de C: sem A, a tela mostra B C D, e soltar no índice 1 é antes de C.
    expect(posicaoNaFaixa([b, c, d], 1, 0)).toBe(1);
  });

  it('soltar antes de um card visivel poe o arrastado logo antes dele', () => {
    // Arrastar A para antes de D. Sem A, a tela mostra B D; D estava em 3, e com A fora sobe
    // para 2. Inserir em 2 deixa B C A D: A imediatamente antes de D, e C no lugar dele.
    expect(posicaoNaFaixa([b, d], 1, 0)).toBe(2);
  });

  it('soltar no fim da tela poe o arrastado logo depois do ultimo visivel', () => {
    // Arrastar A para o fim: depois de D, que com A fora fica em 2. A vai para 3.
    expect(posicaoNaFaixa([b, d], 2, 0)).toBe(3);
  });

  it('subir na faixa nao precisa de ajuste: quem esta antes da origem nao se move', () => {
    // Arrastar D para o topo: sem D, a tela mostra A B. Soltar no 0 é antes de A.
    expect(posicaoNaFaixa([a, b], 0, 3)).toBe(0);
  });

  it('vindo de outra faixa, a posicao do vizinho vale como esta', () => {
    // Nada sai da faixa de destino, então ninguém sobe uma casa.
    expect(posicaoNaFaixa([a, b, d], 2, null)).toBe(3);
    expect(posicaoNaFaixa([a, b, d], 3, null)).toBe(4);
  });

  it('faixa sem card visivel recebe no fim, e o servidor acomoda', () => {
    expect(posicaoNaFaixa([], 0, null)).toBe(FIM_DA_FAIXA);
  });

  it('o fim da faixa cabe no Integer do Java', () => {
    expect(FIM_DA_FAIXA).toBe(2 ** 31 - 1);
  });
});

describe('filtro de concluidas', () => {
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
  });
});

describe('soltar com concluidas ocultas', () => {
  /**
   * O componente é construído à mão, sem desenhar o template: o `ngOnInit` não roda, e a
   * única chamada à API é a do arrastar, falsificada.
   */
  function criarTela(respostaDoServidor: Faixa[]) {
    const moverTarefa = vi.fn().mockResolvedValue({ faixas: respostaDoServidor });

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { moverTarefa } },
        { provide: MatDialog, useValue: {} },
      ],
    });

    return { tela: TestBed.runInInjectionContext(() => new Tarefas()), moverTarefa };
  }

  function evento(
    faixa: Faixa,
    arrastada: Tarefa,
    previousIndex: number,
    currentIndex: number,
  ): CdkDragDrop<Faixa> {
    const lista = { data: faixa };
    return {
      previousContainer: lista,
      container: lista,
      item: { data: arrastada },
      previousIndex,
      currentIndex,
    } as unknown as CdkDragDrop<Faixa>;
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
    const respostaDoServidor: Faixa[] = [
      {
        prioridade: 'MEDIA',
        tarefas: [
          { ...b, posicao: 0 },
          { ...c, posicao: 1 },
          { ...a, posicao: 2 },
          { ...d, posicao: 3 },
        ],
      },
    ];
    const { tela, moverTarefa } = criarTela(respostaDoServidor);

    // A tela mostra A B D: C está oculta.
    tela.faixas.set(faixas([a, b, d]));
    const media = tela.faixas()[1];

    // Arrastar A (índice 0 na tela) para antes de D (índice 1 depois de A sair).
    await tela.soltar(evento(media, a, 0, 1));

    expect(moverTarefa).toHaveBeenCalledWith(a.id, { prioridade: 'MEDIA', posicao: 2 });

    const naTela = tela.faixas()[1].tarefas;
    expect(naTela.map((t) => t.id)).toEqual([b.id, a.id, d.id]);
    // As posições novas vêm do servidor, e são elas que o próximo arrastar vai usar.
    expect(naTela.map((t) => t.posicao)).toEqual([0, 2, 3]);
  });
});
