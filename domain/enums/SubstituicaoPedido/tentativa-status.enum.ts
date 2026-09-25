export enum TentativaStatusEnum {
  AguardandoGateLider = 'AguardandoGateLider',
  Convidada = 'Convidada',
  Aceita = 'Aceita',
  Recusada = 'Recusada',
  ExpiradaPrazo = 'ExpiradaPrazo',
  VetadaPeloLider = 'VetadaPeloLider',
  // Candidato aceitou oferecendo troca (ADR-0013); falta o solicitante confirmar.
  AguardandoConfirmacaoSolicitante = 'AguardandoConfirmacaoSolicitante',
}

export const TentativaStatusEnumLabel: Record<TentativaStatusEnum, string> = {
  [TentativaStatusEnum.AguardandoGateLider]: 'Aguardando aprovação do líder',
  [TentativaStatusEnum.Convidada]: 'Convite enviado',
  [TentativaStatusEnum.Aceita]: 'Aceita',
  [TentativaStatusEnum.Recusada]: 'Recusada',
  [TentativaStatusEnum.ExpiradaPrazo]: 'Prazo expirado',
  [TentativaStatusEnum.VetadaPeloLider]: 'Vetada pelo líder',
  [TentativaStatusEnum.AguardandoConfirmacaoSolicitante]: 'Troca aguardando confirmação',
};
