import { HttpErrorResponse } from '@angular/common/http';
import { ErroDaApi } from './modelos';

/**
 * Traduz uma falha de requisição na frase que a tela mostra.
 *
 * <p>A API tem formato único de erro, e a `mensagem` dele já vem escrita para quem lê —
 * "Usuário ou senha inválidos", "Já existe uma categoria chamada...". Reescrevê-la aqui
 * criaria duas versões da mesma frase, e a do servidor é a que o log registra.
 *
 * <p>Os dois casos em que o servidor não tem como falar:
 *
 * <ul>
 *   <li><b>status 0</b> — a requisição não chegou. Navegador offline, backend fora do ar,
 *       ou CORS barrando antes de qualquer resposta.</li>
 *   <li><b>corpo sem `mensagem`</b> — erro gerado fora dos nossos manipuladores, como o
 *       `404` do próprio servidor para uma rota que não existe.</li>
 * </ul>
 */
export function mensagemDoErro(erro: unknown): string {
  if (!(erro instanceof HttpErrorResponse)) {
    return 'Algo deu errado. Tente de novo.';
  }

  if (erro.status === 0) {
    return 'Não foi possível falar com o servidor. Verifique se ele está no ar.';
  }

  const corpo = erro.error as Partial<ErroDaApi> | null;
  return corpo?.mensagem ?? `Falha na requisição (${erro.status}).`;
}

/**
 * Os erros por campo, quando a falha é de validação. Vazio em qualquer outro caso — a API
 * manda `erros: {}` em vez de omitir a chave, justamente para o cliente não tratar dois
 * formatos.
 */
export function errosPorCampo(erro: unknown): Record<string, string> {
  if (!(erro instanceof HttpErrorResponse)) {
    return {};
  }

  const corpo = erro.error as Partial<ErroDaApi> | null;
  return corpo?.erros ?? {};
}
