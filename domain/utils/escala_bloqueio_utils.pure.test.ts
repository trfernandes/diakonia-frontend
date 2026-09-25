import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { extrairItensEscalaPublicada } from './escala_bloqueio_utils';

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
