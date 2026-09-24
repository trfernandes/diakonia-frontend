import {
  CriarLancamentoDto,
  LancamentosIndisponibilidadeApi,
  SalvarConfigDto,
} from '../api/LancamentosIndisponibilidadeApi';

class LancamentosIndisponibilidadeRepositoryClass {
  listar = (ministerioId: string) => LancamentosIndisponibilidadeApi.listar(ministerioId);
  detalhe = (ministerioId: string, lancamentoId: string) =>
    LancamentosIndisponibilidadeApi.detalhe(ministerioId, lancamentoId);
  resumo = (ministerioId: string, inicio: string, fim: string) =>
    LancamentosIndisponibilidadeApi.resumo(ministerioId, inicio, fim);
  criar = (ministerioId: string, dto: CriarLancamentoDto) =>
    LancamentosIndisponibilidadeApi.criar(ministerioId, dto);
  cancelar = (ministerioId: string, lancamentoId: string) =>
    LancamentosIndisponibilidadeApi.cancelar(ministerioId, lancamentoId);
  config = (ministerioId: string) => LancamentosIndisponibilidadeApi.config(ministerioId);
  salvarConfig = (ministerioId: string, dto: SalvarConfigDto) =>
    LancamentosIndisponibilidadeApi.salvarConfig(ministerioId, dto);
  pularMes = (ministerioId: string, mes: string) =>
    LancamentosIndisponibilidadeApi.pularMes(ministerioId, mes);
  despularMes = (ministerioId: string, mes: string) =>
    LancamentosIndisponibilidadeApi.despularMes(ministerioId, mes);
  meus = () => LancamentosIndisponibilidadeApi.meus();
  marcarJaLancei = (lancamentoId: string) =>
    LancamentosIndisponibilidadeApi.marcarJaLancei(lancamentoId);
  desfazerJaLancei = (lancamentoId: string) =>
    LancamentosIndisponibilidadeApi.desfazerJaLancei(lancamentoId);
}

export const LancamentosIndisponibilidadeRepository =
  new LancamentosIndisponibilidadeRepositoryClass();
