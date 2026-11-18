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
  /** Índice na faixa, sempre 0..n-1. É com ele que o arrastar monta o PATCH. */
  posicao: number;
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
