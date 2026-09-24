export enum NotificacaoTipoEnum {
  // Voluntário
  EscalaLembrete = 'ESCALA_LEMBRETE',
  EscalaPublicada = 'ESCALA_PUBLICADA',
  EscalaAtualizada = 'ESCALA_ATUALIZADA',
  EscalaSubstituicaoSolicitada = 'ESCALA_SUBSTITUICAO_SOLICITADA',
  EscalaSubstituicaoAceita = 'ESCALA_SUBSTITUICAO_ACEITA',
  EscalaSubstituicaoRecusada = 'ESCALA_SUBSTITUICAO_RECUSADA',
  EscalaAlterada = 'ESCALA_ALTERADA',
  EscalaCancelada = 'ESCALA_CANCELADA',
  EscalaConfirmacaoSolicitada = 'ESCALA_CONFIRMACAO_SOLICITADA',
  EscalaConfirmacaoPendente = 'ESCALA_CONFIRMACAO_PENDENTE',
  EscalaTrocaSolicitada = 'ESCALA_TROCA_SOLICITADA',
  EscalaTrocaAprovada = 'ESCALA_TROCA_APROVADA',

  // Líder de Ministério
  EscalaVoluntarioConfirmou = 'ESCALA_VOLUNTARIO_CONFIRMOU',
  EscalaVoluntarioRecusou = 'ESCALA_VOLUNTARIO_RECUSOU',
  EscalaSubstituicaoSolicitadaLider = 'ESCALA_SUBSTITUICAO_SOLICITADA_LIDER',
  EscalaSubstituicaoResolvidaLider = 'ESCALA_SUBSTITUICAO_RESOLVIDA_LIDER',
  MinisterioNovoIntegrante = 'MINISTERIO_NOVO_INTEGRANTE',
  IndisponibilidadeConflito = 'INDISPONIBILIDADE_CONFLITO',
  ComunicadoLider = 'COMUNICADO_LIDER',
  LancamentoIndisponibilidadeCriado = 'LANCAMENTO_INDISPONIBILIDADE_CRIADO',
  LancamentoIndisponibilidadeLembrete = 'LANCAMENTO_INDISPONIBILIDADE_LEMBRETE',
  LancamentoIndisponibilidadeVespera = 'LANCAMENTO_INDISPONIBILIDADE_VESPERA',

  // Responsável da Igreja (Admin)
  IgrejaConviteAceito = 'IGREJA_CONVITE_ACEITO',
  IgrejaVinculoSolicitado = 'IGREJA_VINCULO_SOLICITADO',
  IgrejaVinculoAprovado = 'IGREJA_VINCULO_APROVADO',
  IgrejaVinculoNegado = 'IGREJA_VINCULO_NEGADO',
  IgrejaNovoVoluntario = 'IGREJA_NOVO_VOLUNTARIO',
  IgrejaConviteExpirado = 'IGREJA_CONVITE_EXPIRADO',
  SistemaAlertaAdmin = 'SISTEMA_ALERTA_ADMIN',

  // Geração de escala (admin/líder)
  EscalaGerada = 'ESCALA_GERADA',
  EscalaErroGerada = 'ESCALA_ERRO_GERADA',

  // Dev
  TesteLocal = 'TESTE_LOCAL',
  Generic = 'GENERIC',
}
