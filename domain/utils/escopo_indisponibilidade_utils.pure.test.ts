import { describe, it, expect } from 'vitest';
import {
  resumoEscopoIndisponibilidade,
  temEscopoSelecionado,
  agruparFuncoesPorMinisterio,
} from './escopo_indisponibilidade_utils';

describe('escopo_indisponibilidade_utils', () => {
  const ministerios = [
    { id: 'min1', nome: 'Louvor' },
    { id: 'min2', nome: 'Mídia' },
    { id: 'min3', nome: 'Visitação' },
  ];

  const funcoes = [
    { id: 'func1', nome: 'Vocal', ministerioId: 'min1' },
    { id: 'func2', nome: 'Guitarra', ministerioId: 'min1' },
    { id: 'func3', nome: 'Câmera', ministerioId: 'min2' },
    { id: 'func4', nome: 'Áudio', ministerioId: 'min2' },
  ];

  describe('resumoEscopoIndisponibilidade', () => {
    it('retorna "Todos os ministérios" quando nada é selecionado', () => {
      const resultado = resumoEscopoIndisponibilidade([], [], ministerios, funcoes);
      expect(resultado).toBe('Todos os ministérios');
    });

    it('retorna "Todos os ministérios" quando tudo é null/undefined', () => {
      const resultado = resumoEscopoIndisponibilidade(null, undefined, ministerios, funcoes);
      expect(resultado).toBe('Todos os ministérios');
    });

    it('retorna ministério quando um ministério inteiro é selecionado', () => {
      const resultado = resumoEscopoIndisponibilidade(['min1'], [], ministerios, funcoes);
      expect(resultado).toBe('Louvor');
    });

    it('retorna múltiplos ministérios quando vários são selecionados', () => {
      const resultado = resumoEscopoIndisponibilidade(['min1', 'min2'], [], ministerios, funcoes);
      expect(resultado).toBe('Louvor, Mídia');
    });

    it('retorna ministério:funções quando funções específicas são selecionadas', () => {
      const resultado = resumoEscopoIndisponibilidade([], ['func1', 'func2'], ministerios, funcoes);
      expect(resultado).toBe('Louvor: Vocal, Guitarra');
    });

    it('agrupa funções do mesmo ministério', () => {
      const resultado = resumoEscopoIndisponibilidade([], ['func1', 'func3'], ministerios, funcoes);
      expect(resultado).toBe('Louvor: Vocal, Mídia: Câmera');
    });

    it('combina ministérios inteiros e funções', () => {
      const resultado = resumoEscopoIndisponibilidade(
        ['min1'],
        ['func3', 'func4'],
        ministerios,
        funcoes,
      );
      expect(resultado).toBe('Louvor, Mídia: Câmera, Áudio');
    });

    it('ignora IDs vazios/inválidos', () => {
      const resultado = resumoEscopoIndisponibilidade(
        ['min1', ''],
        ['func1', 'invalid-id'],
        ministerios,
        funcoes,
      );
      expect(resultado).toBe('Louvor: Vocal');
    });
  });

  describe('temEscopoSelecionado', () => {
    it('retorna false quando nada é selecionado', () => {
      expect(temEscopoSelecionado([], [])).toBe(false);
      expect(temEscopoSelecionado(null, null)).toBe(false);
      expect(temEscopoSelecionado(undefined, undefined)).toBe(false);
    });

    it('retorna true quando há ministério inteiro selecionado', () => {
      expect(temEscopoSelecionado(['min1'], [])).toBe(true);
    });

    it('retorna true quando há função selecionada', () => {
      expect(temEscopoSelecionado([], ['func1'])).toBe(true);
    });

    it('retorna true quando há ambos', () => {
      expect(temEscopoSelecionado(['min1'], ['func1'])).toBe(true);
    });

    it('ignora IDs vazios', () => {
      expect(temEscopoSelecionado([''], [''])).toBe(false);
    });
  });

  describe('agruparFuncoesPorMinisterio', () => {
    it('agrupa funções por ministério', () => {
      const resultado = agruparFuncoesPorMinisterio(funcoes, ministerios);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].ministerioNome).toBe('Louvor');
      expect(resultado[0].funcoes).toHaveLength(2);
      expect(resultado[1].ministerioNome).toBe('Mídia');
      expect(resultado[1].funcoes).toHaveLength(2);
    });

    it('ordena ministérios alfabeticamente', () => {
      const resultado = agruparFuncoesPorMinisterio(funcoes, ministerios);
      expect(resultado[0].ministerioNome).toBe('Louvor');
      expect(resultado[1].ministerioNome).toBe('Mídia');
    });

    it('ordena funções dentro de cada ministério', () => {
      const resultado = agruparFuncoesPorMinisterio(funcoes, ministerios);
      const louvor = resultado.find((a) => a.ministerioId === 'min1');
      expect(louvor?.funcoes.map((f) => f.nome)).toEqual(['Guitarra', 'Vocal']);
    });

    it('ignora funções de ministérios inválidos', () => {
      const funcoesInvalidas = [...funcoes, { id: 'func5', nome: 'Fake', ministerioId: 'invalid' }];
      const resultado = agruparFuncoesPorMinisterio(funcoesInvalidas, ministerios);
      expect(resultado).toHaveLength(2);
    });

    it('retorna array vazio quando não há funções', () => {
      const resultado = agruparFuncoesPorMinisterio([], ministerios);
      expect(resultado).toEqual([]);
    });
  });
});
