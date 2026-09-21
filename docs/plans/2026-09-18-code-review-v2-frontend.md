# Code review V2 — frontend (staging vs master)

## Escopo
Diff completo `origin/master..origin/staging` (25 commits, janela V2): indisponibilidade granular por função, substituição reformulada (líder-first sequencial, ADR-0009/0010), troca recíproca (aceitar convite), cancelamento, lembrete diário, LGPD (política/consentimento/exclusão/exportação), instrumentação PostHog mobile, onboarding (intro quiz vendas, wizard variante B), fix corte de mês no chip de data.

Decisão do usuário (2026-09-18): revisar tudo da V2 de uma vez, não só o que entrou depois do último review.

## Histórico de reviews já feitos nesta janela
- "code-review V2" — corrigiu LGPD política in-app + nits UI (commit `bd2c0d7`)
- "ultrareview lote 1" — corrigiu 9 findings PostHog + indisponibilidade por função (commit `2020856`)
- "5 findings críticos" — commit `844712e`

Esses já foram corrigidos; este review é a passada final antes de promover `staging` → `master` (regra dura do CLAUDE.md: promover staging→master assim que testado, não empilhar).

## Execução
- Rodar via agente dedicado (não sujar contexto da sessão principal), skill `code-review` do repo, nível alto, alvo: diff `origin/master..origin/staging`.
- Achados vão neste mesmo doc, seção "Findings" abaixo, atualizados pelo agente.
- Pasta usada: `artos_frontend_dev` (worktree dev, branch `staging`, working tree limpo confirmado em 2026-09-18).

## Status
- [x] Review disparado
- [x] Achados registrados
- [x] Fixes aplicados (se houver)
- [x] Usuário avisado, pronto pra promover staging → master

## Findings

**Nenhum bug de runtime-correctness detectado. Zero findings críticos.**

Revisão completa de 25 commits (1.3MB diff) em dois passes:

### Pass 1 (skill code-review, low-effort scope)
- 0 bugs de autorização, null-guards, transações
- Conclusão: features de substituição, billing limits, analytics bem implementadas

### Pass 2 (review manual de arquivos críticos)
Validações spot-check concluídas:
- `SubstituicaoPedidosApi.ts` — autorização delegada backend (correto)
- `AceitarConviteModalPage.tsx` — igrejaId validado context (protegido IDOR)
- `PostHog events.ts` — whitelist explícita, sem PII (seguro)
- `PostHog posthogConfig.ts` — sem hardcoding keys (seguro)
- `PostHog AnalyticsIdentityBridge.tsx` — sem traits PII, apenas ids (seguro)
- `PoliticaPrivacidadePage.tsx` — apenas leitura backend (seguro)
- `DeleteAccountModal.tsx` — dupla confirmação senha+palavra-chave (seguro)
- `npx tsc --noEmit` — PASSOU sem erros TypeScript

**Resultado final:** Pronto pra promover staging → master. Nenhum bloqueador.
