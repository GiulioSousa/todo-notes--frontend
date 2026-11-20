#!/usr/bin/env node
//
// Mantem o bloco de versoes do README.md igual ao package.json.
//
// POR QUE ISTO EXISTE
//
// A versao DO REPOSITORIO quem escreve e o release-please, no bloco anotado do README. As
// versoes da PILHA - Angular, Material, CDK, TypeScript, Vitest - nao: elas moram no
// package.json e sobem por PR do Dependabot, que nao sabe que ha um README falando delas.
// Sem este script, a tabela do README envelhece em silencio, e um README que mente sobre a
// versao do Angular e pior do que um README sem tabela.
//
// COMO RODAR
//
//   node .github/scripts/versoes-readme.mjs             # escreve o bloco
//   node .github/scripts/versoes-readme.mjs --conferir   # so confere, e falha se divergir
//
// O `--conferir` e o que o CI roda: ele transforma a defasagem em falha de build enquanto o
// PR do Dependabot ainda esta aberto.

import { readFileSync, writeFileSync } from 'node:fs';

const INICIO = '<!-- versoes:inicio -->';
const FIM = '<!-- versoes:fim -->';

const conferir = process.argv.includes('--conferir');
const pacote = JSON.parse(readFileSync('package.json', 'utf8'));
const readme = readFileSync('README.md', 'utf8');

/** O `^` e o `~` saem: o README diz a versao pedida, nao a sintaxe do intervalo. */
function versao(nome) {
  const bruta = pacote.dependencies?.[nome] ?? pacote.devDependencies?.[nome];
  if (!bruta) {
    throw new Error(`nao achei ${nome} no package.json`);
  }
  return bruta.replace(/^[\^~]/, '');
}

const linhas = [
  ['Angular', versao('@angular/core')],
  ['Angular Material', versao('@angular/material')],
  ['Angular CDK', versao('@angular/cdk')],
  ['TypeScript', versao('typescript')],
  ['Vitest', versao('vitest')],
];

const tabela = [
  '| Peça | Versão |',
  '| --- | --- |',
  ...linhas.map(([peca, v]) => `| ${peca} | ${v} |`),
].join('\n');

const blocoNovo = `${INICIO}\n\n${tabela}\n\n${FIM}`;

const inicio = readme.indexOf(INICIO);
const fim = readme.indexOf(FIM);
if (inicio === -1 || fim === -1) {
  console.error(`ERRO: o README.md nao tem o par ${INICIO} ... ${FIM}`);
  process.exit(2);
}

const atualizado = readme.slice(0, inicio) + blocoNovo + readme.slice(fim + FIM.length);

if (atualizado === readme) {
  console.log('O bloco de versoes do README esta em dia.');
  process.exit(0);
}

if (conferir) {
  console.error('ERRO: o bloco de versoes do README nao corresponde ao package.json.');
  console.error('Rode: node .github/scripts/versoes-readme.mjs');
  console.error('');
  console.error('Esperado:');
  console.error(tabela);
  process.exit(1);
}

writeFileSync('README.md', atualizado);
console.log('Bloco de versoes do README atualizado.');
