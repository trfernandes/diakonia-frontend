// Datas do Lançamento de Indisponibilidade chegam do backend como 'yyyy-MM-dd' (sem fuso).
// Tudo aqui opera em string ISO pra não cair no bug de fuso de `new Date('yyyy-MM-dd')` (UTC).

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export type TipoAviso = 'inicial' | 'lembrete' | 'vespera';
export type AvisoAgendado = { data: string; tipo: TipoAviso };

const pad = (n: number) => String(n).padStart(2, '0');

export function ymdDeDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function hojeYmd(): string {
  return ymdDeDate(new Date());
}

function dateDeYmd(ymd: string): Date {
  const [a, m, d] = ymd.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function somarDias(ymd: string, dias: number): string {
  const d = dateDeYmd(ymd);
  d.setDate(d.getDate() + dias);
  return ymdDeDate(d);
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((dateDeYmd(ate).getTime() - dateDeYmd(de).getTime()) / 86_400_000);
}

/** '2026-10-27' → '27/10' */
export function formatarDiaMes(ymd: string): string {
  return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
}

/** '2026-10-27' → '27/10/2026' */
export function formatarData(ymd: string): string {
  return `${formatarDiaMes(ymd)}/${ymd.slice(0, 4)}`;
}

/** '2026-11' ou '2026-11-01' → 'novembro' */
export function nomeMes(ymOuYmd: string): string {
  return MESES[Number(ymOuYmd.slice(5, 7)) - 1] ?? '';
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function ultimoDiaDoMes(ym: string): string {
  const [a, m] = ym.split('-').map(Number);
  return `${ym}-${pad(new Date(a, m, 0).getDate())}`;
}

/**
 * Nome curto do período pro título dos cards: mês inteiro vira "novembro";
 * qualquer outro recorte vira "01/11 a 15/12".
 */
export function rotuloPeriodo(inicio: string, fim: string): string {
  const mesInteiro = inicio.endsWith('-01') && fim === ultimoDiaDoMes(inicio.slice(0, 7));
  return mesInteiro ? nomeMes(inicio) : `${formatarDiaMes(inicio)} a ${formatarDiaMes(fim)}`;
}

/**
 * Mesmo cálculo do job do backend (lancamento-datas.ts → tipoLembreteDoDia):
 * aviso inicial no dia da criação, lembrete a cada 3 dias, véspera do prazo.
 * Só pra quem ainda não marcou "Já lancei".
 */
export function tipoLembreteDoDia(
  dia: string,
  criadoEm: string,
  prazo: string,
): 'vespera' | 'lembrete' | null {
  if (dia >= prazo) return null;
  if (somarDias(dia, 1) === prazo) return 'vespera';
  const dias = diasEntre(criadoEm, dia);
  if (dias > 0 && dias % 3 === 0) return 'lembrete';
  return null;
}

/** Todos os avisos que um Lançamento criado em `criadoEm` vai disparar até o prazo. */
export function agendaDeAvisos(criadoEm: string, prazo: string): AvisoAgendado[] {
  const avisos: AvisoAgendado[] = [{ data: criadoEm, tipo: 'inicial' }];
  for (let dia = somarDias(criadoEm, 1); dia < prazo; dia = somarDias(dia, 1)) {
    const tipo = tipoLembreteDoDia(dia, criadoEm, prazo);
    if (tipo) avisos.push({ data: dia, tipo });
  }
  return avisos;
}

/** Próximo aviso ainda não enviado (a partir de amanhã), ou null se não sai mais nenhum. */
export function proximoAviso(criadoEm: string, prazo: string, hoje: string): AvisoAgendado | null {
  return agendaDeAvisos(criadoEm, prazo).find((a) => a.data > hoje) ?? null;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primeira = partes[0][0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}

/** Meses ('yyyy-MM') que o período toca — mesmo cálculo do backend (mesesDoPeriodo). */
export function mesesDoPeriodo(inicio: string, fim: string): string[] {
  const meses: string[] = [];
  let [ano, mes] = inicio.slice(0, 7).split('-').map(Number);
  const fimYm = fim.slice(0, 7);
  for (let ym = `${ano}-${pad(mes)}`; ym <= fimYm; ym = `${ano}-${pad(mes)}`) {
    meses.push(ym);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return meses;
}

/** Primeiro e último dia do mês seguinte ao de `hoje` — sugestão padrão do Novo lançamento. */
export function proximoMesInteiro(hoje: string): { inicio: string; fim: string } {
  const [a, m] = hoje.split('-').map(Number);
  const ano = m === 12 ? a + 1 : a;
  const mes = m === 12 ? 1 : m + 1;
  const ym = `${ano}-${pad(mes)}`;
  return { inicio: `${ym}-01`, fim: ultimoDiaDoMes(ym) };
}
