import { describe, expect, it } from 'vitest';
import {
  agendaDeAvisos,
  formatarDiaMes,
  iniciais,
  mesesDoPeriodo,
  proximoMesInteiro,
  proximoAviso,
  rotuloPeriodo,
  tipoLembreteDoDia,
} from './lancamento_indisponibilidade_utils';

describe('lancamento_indisponibilidade_utils', () => {
  it('formata dia/mês sem passar por Date (sem bug de fuso)', () => {
    expect(formatarDiaMes('2026-10-27')).toBe('27/10');
  });

  it('rótulo: mês inteiro vira nome do mês, recorte vira intervalo', () => {
    expect(rotuloPeriodo('2026-11-01', '2026-11-30')).toBe('novembro');
    expect(rotuloPeriodo('2027-02-01', '2027-02-28')).toBe('fevereiro');
    expect(rotuloPeriodo('2026-11-01', '2026-11-29')).toBe('01/11 a 29/11');
    expect(rotuloPeriodo('2026-11-15', '2026-12-15')).toBe('15/11 a 15/12');
  });

  // Mesmos casos do backend (lancamento-datas.spec.ts) — as duas pontas precisam concordar.
  describe('tipoLembreteDoDia', () => {
    it('a cada 3 dias desde a criação', () => {
      expect(tipoLembreteDoDia('2026-10-23', '2026-10-20', '2026-10-31')).toBe('lembrete');
      expect(tipoLembreteDoDia('2026-10-22', '2026-10-20', '2026-10-31')).toBeNull();
      expect(tipoLembreteDoDia('2026-10-20', '2026-10-20', '2026-10-31')).toBeNull();
    });

    it('véspera tem prioridade', () => {
      expect(tipoLembreteDoDia('2026-10-26', '2026-10-20', '2026-10-27')).toBe('vespera');
    });

    it('no dia do prazo e depois não envia', () => {
      expect(tipoLembreteDoDia('2026-10-27', '2026-10-24', '2026-10-27')).toBeNull();
      expect(tipoLembreteDoDia('2026-10-30', '2026-10-24', '2026-10-27')).toBeNull();
    });
  });

  it('agenda: inicial, lembretes a cada 3 dias, véspera', () => {
    expect(agendaDeAvisos('2026-10-20', '2026-10-31')).toEqual([
      { data: '2026-10-20', tipo: 'inicial' },
      { data: '2026-10-23', tipo: 'lembrete' },
      { data: '2026-10-26', tipo: 'lembrete' },
      { data: '2026-10-29', tipo: 'lembrete' },
      { data: '2026-10-30', tipo: 'vespera' },
    ]);
  });

  it('agenda: prazo amanhã só tem o inicial (véspera cai no mesmo dia da criação)', () => {
    expect(agendaDeAvisos('2026-10-20', '2026-10-21')).toEqual([
      { data: '2026-10-20', tipo: 'inicial' },
    ]);
  });

  it('agenda atravessa virada de mês', () => {
    const avisos = agendaDeAvisos('2026-10-30', '2026-11-05');
    expect(avisos.map((a) => a.data)).toEqual(['2026-10-30', '2026-11-02', '2026-11-04']);
  });

  it('próximo aviso depois de hoje', () => {
    expect(proximoAviso('2026-10-20', '2026-10-31', '2026-10-24')).toEqual({
      data: '2026-10-26',
      tipo: 'lembrete',
    });
    expect(proximoAviso('2026-10-20', '2026-10-31', '2026-10-30')).toBeNull();
  });

  it('iniciais', () => {
    expect(iniciais('Ana Paula Souza')).toBe('AS');
    expect(iniciais('bruno')).toBe('B');
    expect(iniciais('  ')).toBe('?');
  });
});

describe('mesesDoPeriodo / proximoMesInteiro', () => {
  it('lista meses tocados atravessando o ano', () => {
    expect(mesesDoPeriodo('2026-11-25', '2027-01-05')).toEqual(['2026-11', '2026-12', '2027-01']);
  });
  it('mês seguinte inteiro, virando o ano em dezembro', () => {
    expect(proximoMesInteiro('2026-09-24')).toEqual({ inicio: '2026-10-01', fim: '2026-10-31' });
    expect(proximoMesInteiro('2026-12-10')).toEqual({ inicio: '2027-01-01', fim: '2027-01-31' });
  });
});
