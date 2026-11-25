/**
 * Os tipos da API, espelhando a Seção 6 do ESPECIFICACOES.md.
 *
 * São a fronteira do frontend: tudo o que entra pela rede passa por aqui, e nenhum outro
 * arquivo precisa saber o formato do JSON. Os nomes seguem os do backend — mudar um nome
 * aqui sem mudar lá quebra em tempo de execução, não de compilação, porque JSON não tem
 * tipo.
 */

/** A ordem de declaração é a ordem das faixas na tela, como no ENUM nativo do banco. */
export type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA';

/**
 * Como a lista está agrupada — e, com isso, qual das duas ordens está à vista.
 *
 * <p>Cada modo guarda a sua própria ordem no servidor: arrastar num deles não mexe no outro.
 * Não é só uma forma de desenhar a mesma lista; são duas listas da mesma coisa.
 */
export type ModoDeVisualizacao = 'PRIORIDADE' | 'CATEGORIA';

export type Status = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';

/** O parâmetro `concluidas` da listagem. `PADRAO` aplica a preferência do dono. */
export type FiltroDeConcluidas = 'PADRAO' | 'TODAS' | 'NENHUMA';

export interface Categoria {
  id: number;
  nome: string;
}

export interface Tarefa {
  id: number;
  titulo: string;
  descricao: string | null;
  status: Status;
  prioridade: Prioridade;
  /**
   * As duas posições do card, uma por agrupamento, sempre 0..n-1 dentro do grupo.
   *
   * <p>Vêm as duas em toda resposta, e com o nome do agrupamento de cada uma: é com elas que
   * o arrastar monta o `PATCH` — a de prioridade para o `/lugar`, a de categoria para o
   * `/lugar-na-categoria`. Um campo único chamado `posicao`, que mudasse de significado
   * conforme a rota que respondeu, obrigaria quem lê a saber de onde o JSON veio.
   */
  posicaoNaPrioridade: number;
  posicaoNaCategoria: number;
  /** Nula quando a tarefa não tem etiqueta — ou quando a categoria foi excluída. */
  categoria: Categoria | null;
  criadaEm: string;
  dataConclusao: string | null;
}

export interface Faixa {
  prioridade: Prioridade;
  tarefas: Tarefa[];
}

/** O envelope da listagem: as três faixas, sempre, mesmo vazias. */
export interface ListaDeTarefas {
  faixas: Faixa[];
}

/**
 * Um grupo da listagem por categoria. `categoria` nula é o grupo das tarefas sem etiqueta —
 * objeto nulo, e não um id especial: o rótulo quem escreve é a tela.
 */
export interface GrupoDeCategoria {
  categoria: Categoria | null;
  tarefas: Tarefa[];
}

/**
 * O envelope da listagem por categoria: um grupo por categoria cadastrada, mesmo vazia, e o
 * das sem etiqueta no fim.
 *
 * <p>É um envelope diferente do das faixas porque a chave do grupo é de outra natureza — lá
 * um enum que o cliente já conhece, aqui uma categoria que ele acabou de cadastrar, ou
 * nenhuma.
 */
export interface ListaPorCategoria {
  grupos: GrupoDeCategoria[];
}

export interface NovaTarefa {
  titulo: string;
  descricao?: string | null;
  prioridade: Prioridade;
  categoriaId?: number | null;
}

export interface EdicaoDeTarefa {
  titulo: string;
  descricao?: string | null;
  categoriaId?: number | null;
}

/** O par que o arrastar muda. Posição fora do intervalo é ajustada pelo servidor. */
export interface Lugar {
  prioridade: Prioridade;
  posicao: number;
}

/**
 * O mesmo par no outro agrupamento. `categoriaId` nulo é o grupo das sem etiqueta — soltar
 * um card ali tira a etiqueta dele, porque a categoria é a chave do grupo.
 */
export interface LugarNaCategoria {
  categoriaId: number | null;
  posicao: number;
}

export interface Preferencias {
  ocultarConcluidasAutomaticamente: boolean;
  diasParaOcultar: number;
}

export interface RespostaAutenticacao {
  token: string;
  usuario: string;
  expiraEm: string;
}

/**
 * O formato único de erro da API. `erros` vem vazio fora de falha de validação, e nunca
 * nulo — o cliente trata um formato, não dois.
 */
export interface ErroDaApi {
  momento: string;
  status: number;
  mensagem: string;
  erros: Record<string, string>;
}
