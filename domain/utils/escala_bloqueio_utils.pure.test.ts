import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  agruparProblemasPorItem,
  extrairItensEscalaPublicada,
  extrairProblemasPublicacao,
  ProblemaPublicacao,
} from './escala_bloqueio_utils';

function axiosErro(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('erro', String(status), config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
}

const item = {
  escalaItemId: 'ei1',
  data: '2027-01-18',
  ministerio: 'Louvor',
  funcao: 'Vocal',
  nomeEvento: 'Culto',
};

describe('extrairItensEscalaPublicada', () => {
  it('lê itensAfetados do envelope { error } do HttpExceptionFilter', () => {
    const erro = axiosErro(409, {
      success: false,
      error: { code: 'ESCALADO_EM_ESCALA_PUBLICADA', itensAfetados: [item] },
    });
    expect(extrairItensEscalaPublicada(erro)).toEqual([item]);
  });

  it('ignora 409 de outro código', () => {
    const erro = axiosErro(409, { error: { code: 'OUTRO' } });
    expect(extrairItensEscalaPublicada(erro)).toBeNull();
  });

  it('ignora erro que não é 409', () => {
    const erro = axiosErro(500, { error: { code: 'ESCALADO_EM_ESCALA_PUBLICADA' } });
    expect(extrairItensEscalaPublicada(erro)).toBeNull();
    expect(extrairItensEscalaPublicada(new Error('x'))).toBeNull();
  });
});

const indisponivel: ProblemaPublicacao = {
  escalaItemId: 'ei1',
  voluntarioNome: 'Ana',
  data: '2027-01-18',
  tipo: 'INDISPONIVEL',
  detalhe: 'Indisponível em 18/01/2027',
};
const conflito: ProblemaPublicacao = {
  escalaItemId: 'ei1',
  voluntarioNome: 'Ana',
  data: '2027-01-18',
  tipo: 'CONFLITO_HORARIO',
  detalhe: 'Conflito com Mídia (Culto)',
};

describe('extrairProblemasPublicacao', () => {
  it('lê problemas do 409 PUBLICACAO_BLOQUEADA', () => {
    const erro = axiosErro(409, {
      error: { code: 'PUBLICACAO_BLOQUEADA', problemas: [indisponivel] },
    });
    expect(extrairProblemasPublicacao(erro)).toEqual([indisponivel]);
  });

  it('ignora 409 de indisponibilidade em escala publicada', () => {
    const erro = axiosErro(409, { error: { code: 'ESCALADO_EM_ESCALA_PUBLICADA' } });
    expect(extrairProblemasPublicacao(erro)).toBeNull();
  });
});

describe('agruparProblemasPorItem', () => {
  it('junta indisponibilidade e conflito da mesma pessoa no mesmo item', () => {
    const outro = { ...indisponivel, escalaItemId: 'ei2' };
    const mapa = agruparProblemasPorItem([indisponivel, conflito, outro]);
    expect(mapa.get('ei1')).toEqual([indisponivel, conflito]);
    expect(mapa.get('ei2')).toEqual([outro]);
  });
});
