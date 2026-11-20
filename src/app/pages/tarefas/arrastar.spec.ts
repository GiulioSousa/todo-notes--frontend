import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { SessaoService } from '../../core/sessao.service';
import { Tarefas } from './tarefas';

/**
 * A regra do arrastar, que o navegador mostrou e que aqui fica presa por teste: só dá para
 * arrastar quando a tela mostra a faixa inteira.
 *
 * <p>Esconder qualquer card faz o índice na tela deixar de ser a posição na faixa, e um
 * arrastar nessas condições põe o card em lugar diferente do que a pessoa soltou. Por isso a
 * linha que esta classe de testes protege não é cosmética: ela é o que impede o movimento
 * errado.
 *
 * <p>O componente é construído à mão, sem desenhar o template: `vendoAFaixaCompleta` é um
 * `computed` sobre três signals, e são eles — não a tela — que decidem a resposta. Assim o
 * `ngOnInit` não roda, e nenhuma requisição é feita.
 */
function criarTela(): Tarefas {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: SessaoService,
        useValue: { usuario: signal<string | null>('ana'), token: 'tok-123' },
      },
      { provide: MatDialog, useValue: {} },
    ],
  });

  return TestBed.runInInjectionContext(() => new Tarefas());
}

describe('vendoAFaixaCompleta', () => {
  it('comeca desabilitado enquanto as preferencias nao chegam', () => {
    const tela = criarTela();

    expect(tela.preferencias()).toBeNull();
    expect(tela.vendoAFaixaCompleta()).toBe(false);
  });

  it('libera no padrao quando a preferencia de ocultar esta desligada', () => {
    const tela = criarTela();

    tela.preferencias.set({ ocultarConcluidasAutomaticamente: false, diasParaOcultar: 7 });

    expect(tela.vendoAFaixaCompleta()).toBe(true);
  });

  /**
   * A consequência que só apareceu ao implementar: a preferência esconde cards sem ninguém
   * mexer em filtro, então ela sozinha desabilita o arrastar na tela principal.
   */
  it('desabilita no padrao quando a preferencia de ocultar esta ligada', () => {
    const tela = criarTela();

    tela.preferencias.set({ ocultarConcluidasAutomaticamente: true, diasParaOcultar: 7 });

    expect(tela.vendoAFaixaCompleta()).toBe(false);
  });

  /** E é por aqui que ele volta: "mostrar todas" vence a preferência. */
  it('libera com TODAS, mesmo com a preferencia ligada', () => {
    const tela = criarTela();
    tela.preferencias.set({ ocultarConcluidasAutomaticamente: true, diasParaOcultar: 7 });

    tela.filtroDeConcluidas.set('TODAS');

    expect(tela.vendoAFaixaCompleta()).toBe(true);
  });

  it('desabilita com NENHUMA, que e o filtro de ocultar concluidas', () => {
    const tela = criarTela();
    tela.preferencias.set({ ocultarConcluidasAutomaticamente: false, diasParaOcultar: 7 });

    tela.filtroDeConcluidas.set('NENHUMA');

    expect(tela.vendoAFaixaCompleta()).toBe(false);
  });

  it('desabilita com filtro de categoria, ainda que a faixa mostre todas as concluidas', () => {
    const tela = criarTela();
    tela.preferencias.set({ ocultarConcluidasAutomaticamente: false, diasParaOcultar: 7 });
    tela.filtroDeConcluidas.set('TODAS');

    tela.categoriaFiltrada.set(3);

    expect(tela.vendoAFaixaCompleta()).toBe(false);
  });

  it('volta a liberar quando o filtro de categoria sai', () => {
    const tela = criarTela();
    tela.preferencias.set({ ocultarConcluidasAutomaticamente: false, diasParaOcultar: 7 });
    tela.categoriaFiltrada.set(3);
    expect(tela.vendoAFaixaCompleta()).toBe(false);

    tela.categoriaFiltrada.set(null);

    expect(tela.vendoAFaixaCompleta()).toBe(true);
  });
});
