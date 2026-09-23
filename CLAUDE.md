# Diakonia — Frontend

Ver [../CLAUDE.md](../CLAUDE.md) pra paths, comandos, git, scope discipline.

## Estilo de resposta

Toda explicação ou pergunta ao usuário deve explicar conceitos, jargões técnicos, siglas e nomes de
serviços que ele pode não conhecer — não assumir familiaridade. Em perguntas via `AskUserQuestion`,
especialmente decisões complexas, dar contexto e exemplo concreto em cada opção, não só o rótulo
curto.

## EAS Build / Workflows — gotchas

- `.eas/workflows/*.yml`: `on: workflow_dispatch: {}` (objeto vazio) — nunca `workflow_dispatch:`
  sem valor (vira `null`, EAS rejeita com "Invalid workflow definition").
- `google-services.json` (gitignored) some em cloud build: criar EAS env var tipo `file`,
  `eas env:set` (não `env:create`, deprecated), environment `preview` (só
  `production`/`preview`/`development` disponíveis — nome custom exige plano Enterprise); `app.json`
  → `app.config.js` pra ler `process.env.GOOGLE_SERVICES_JSON`; `eas.json` no profile:
  `"environment": "preview"`.
- Dashboard do Workflow: botão **Retry**/**re-run from failed jobs** reusa o commit ORIGINAL do run
  — não pega push novo. Pra buildar commit atualizado: "Run workflow" do zero, ou
  `eas-cli build --profile <x> --platform <y>` direto. `--platform all` builda Android+iOS junto.
- `eas-cli device:list` (checar UDID registrado pra build iOS ad-hoc) falha em modo não-interativo
  sem `--apple-team-id <id>` — pegar o Team ID no erro da primeira tentativa.

## Estado do trabalho e fluxo de branches

Cada frente de trabalho = 1 tarefa na base Notion **"Tarefas Diakonia"**
(`collection://50b40c4b-23c5-4910-8c50-a024e95d881a`). O estado de cada frente (branch, onde parei,
próximo passo, falta testar) vive numa seção `## Estado do trabalho` no corpo dessa tarefa — não em
arquivo solto nem só no chat. Status `Em andamento` = existe branch dedicada + seção preenchida. Uma
branch por frente; feature nunca compartilha branch com hotfix; hotfix sai de `master`. Fluxo
completo de interrupção por hotfix: `../CLAUDE.md` (local, só no PC).

### Duas worktrees fixas

`eas update` / `eas build` / `eas submit` publicam o **estado do disco** daquela pasta, não uma
branch — working tree sujo vaza WIP no bundle. `git status` limpo é pré-requisito de todo OTA/build.

| Pasta                         | Papel                                                                                | Fica em                             |
| ----------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------- |
| `D:\artos\artos_frontend`     | **release**: hotfix, `update:prod`, `build`, `submit`, merge de feature pra `master` | `master` ou `hotfix/*`              |
| `D:\artos\artos_frontend_dev` | **dev**: toda feature/melhoria paralela                                              | sempre `feat/*`, **nunca `master`** |

Pasta dev é permanente e reutilizada entre features (`node_modules` fica; `npm install` só quando
lockfile muda). Uma branch só existe em checkout num worktree por vez — git bloqueia o 2º. Antes de
mergear uma feature na release, a dev precisa sair da branch (`git switch --detach origin/master`),
senão `git branch -d` falha.

`.git` (histórico/refs/remotes) é compartilhado — commit numa pasta aparece na outra na hora. Merge
pra `master` leva só commits alcançáveis pela branch; WIP não-commitado da outra pasta nunca vaza.

### Scripts (`scripts/`)

- `session-start.ps1` — reporta estado das 2 worktrees (branch, tree sujo, branch "gone"). Rodar
  todo início de sessão.
- `feature-start.ps1 -Slug <nome>` — na pasta dev: `fetch` +
  `git switch -c feat/<nome> origin/master`, com guards.
- `feature-merge.ps1 -Slug <nome> [-Next <prox>]` — na pasta release: `checkout master` + `pull` +
  `merge --no-ff` + `push` + apaga branch local/remota. Aborta se a branch está em checkout na dev.
- `pre-ota-check.ps1` — na pasta release: bloqueia OTA/build se não estiver em `master`/`hotfix/*`
  ou se o tree estiver sujo.

Furos comuns: rodar comando na pasta errada (confirmar `pwd` + branch antes); dois Metros num device
(parar um antes); `npm install` esquecido na dev após feature que mexeu em deps.

**Regra dura, causa de incidente real (04/09/2026):** a release só pode estar em `feat/*` pelo
instante do merge (`feature-merge.ps1` já faz isso sozinho: checkout master → merge → checkout
master de novo). Se `session-start.ps1` reportar release em `feat/*` fora desse instante — sinal de
que uma sessão anterior quebrou a regra e deixou WIP lá. Não presumir lixo:
`git add -A && git commit -m "wip: ..."` na própria branch, `git push`, só então trocar pra
`master`. E **avisar o usuário** que a regra foi violada de novo, antes de seguir.

## Expo Router — estrutura de rotas

```
app/
  (auth)/     — Stack sem header; retorna null se user já logado
    login, forgot-password, create-account, admin-discovery,
    create-igreja-account, create-voluntario-account,
    voluntario-aguardando-email, igreja-cadastro-aguardando-email
  (app)/
    (drawer)/  — menu lateral: inicio/, ministerios/, admin/, configuracoes/, pessoal/
    join-church/, notifications.tsx, notification-detail.tsx, voluntarios/
  (public)/
    invite/
```

## Padrões mobile — telas de auth

Padrão oficial: **flat** — sem `AuthLayout`, sem gradiente, sem card manual. Segue o padrão de
login/recovery/cadastro (telas existentes).

Conteúdo do form de toda tela de auth deve ser **centralizado verticalmente** (logo do login é
exceção).

## Padrões mobile — telas de app

- Container: `FancyPageView` (já tem padding 15px — não adicionar padding extra)
- Entre seções distintas dentro de `FancyPageView`: usar `FancyVerticalSpacer`
- Lista: `FancyList` com `FancyListEmpty` para estado vazio
- Scroll livre: `FancyScrollView` (não `ScrollView` nativo)
- Espaçamento horizontal de conteúdo que fica dentro de `FancyScrollView`: aplicar em
  `contentContainerStyle`, nunca no container pai — barra de scroll deve ficar colada na borda da
  tela. Conteúdo fixo fora do scroll (header, empty state) usa padding próprio separado.

## Padrões mobile — formulários

Sempre: `react-hook-form` + `zodResolver` + wrappers `Controlled*`.

```tsx
const { control, handleSubmit } = useForm({ resolver: zodResolver(MeuSchema) });
// Usar Controlled* — nunca os campos Fancy diretamente em formulários com RHF
<ControlledTextInput name="campo" control={control} label="..." />
<ControlledDropDown name="opcao" control={control} label="..." options={...} />
```

Wrappers disponíveis em `components/forms/`: ControlledTextInput, ControlledPasswordInput,
ControlledDropDown, ControlledBottomSheetSelect, ControlledTextArea, ControlledNumberInput,
ControlledMaskedTextInput, ControlledImagePicker, ControlledSearchSelect, ControlledSelectField,
ControlledFancyToggle, ControlledDateInput, ControlledColorPicker.

Sem `Switch` nativo no app. Campo boolean (ex. `ativo`, `recorrente`) usa `ControlledFancyToggle`
com `option1={{ title: 'Não', value: false }}` / `option2={{ title: 'Sim', value: true }}` — mesmo
componente usado pra toggle 2-valor de enum.

## Padrões mobile — dados

Camada: **API → Repository → Hook**

```
domain/api/MinisteriosApi.ts          → extends BaseApi('ministerios')
domain/services/MinisteriosRepository.ts → extends BaseRepository(MinisteriosApi)
hooks/useMinisteriosCrud.ts           → useCrud<>({ queryKey, fetchAll, add, update, remove, resolver, messages })
```

## Sistema de design

### usePallete()

```ts
const Pallete = usePallete();
// Agrupamentos disponíveis:
// Pallete.primary / secondary / terciary / warning / error / confirm
// Pallete.disabled / disabled2 / disabled3 / selected
// Pallete.buttons.active / inactive
// Pallete.fonts.dark / light / inactive / inactive2 / link
// Pallete.icons.dark / light / inactive / inactive2
// Pallete.border / borderCard
// Pallete.backgroundColor / backgroundColor2 / backgroundColor3 / backgroundColor4
// Pallete.overlays.backdrop / strongBackdrop
// Pallete.gradients.auth / drawerHeader / dashboard
// Pallete.shadows[100] / [200] / [300]
```

Para transparência: `ColorUtils.withAlpha(Pallete.primary, 0.12)` — nunca rgba/hex hardcoded.

### Gradientes — uso correto

Gradiente permitido **apenas** nos 4 tokens abaixo e **apenas** nos contextos correspondentes:

```tsx
// auth screens — flat, sem gradiente (ver seção acima)
// drawer header — FancyDrawerHeader já aplica
// dashboard — DashboardCard já aplica
// quiz-vendas — onda-assinatura do funil (QuizGradientWave, QuizSegmentedProgress
//   prop activeGradient) e checkmark do slide de conclusão — ver docs/design-system.md
// Em qualquer outro lugar: usar backgroundColor* tokens
```

### Sombras

```tsx
// Correto:
style={{ ...Pallete.shadows[200] }}
// Nunca:
style={{ elevation: 2, shadowOpacity: 0.2 }}
```

### Proibições absolutas

- Nunca hardcodar hex/rgb/rgba — sempre `usePallete()` ou `ColorUtils.withAlpha()`
- Nunca `Text` nativo — sempre `FancyText`
- Nunca `FlatList` — sempre `FancyList`
- Nunca `ScrollView` nativo — sempre `FancyScrollView`
- Nunca `TouchableOpacity` para botões — sempre `FancyButton` ou `FancyFab`
- Nunca `elevation` diretamente — sempre `Pallete.shadows[100|200|300]`
- Nunca gradiente fora dos 3 tokens permitidos (ver acima)
- Nunca `marginTop`/`marginBottom` ad-hoc entre seções em FancyPageView — usar `FancyVerticalSpacer`
- Nunca fundo cinza em card/item (`backgroundColor2`/`backgroundColor3`, ou `FancyCard` sem prop
  `backgroundColor`, que cai no cinza padrão) — usar tint de cor
  (`ColorUtils.lightenColor(palette.primary|secondary, ~0.96)` claro / `backgroundColor4` escuro) ou
  `backgroundColor` neutro puro

### Decisões rápidas

- Botão principal → `FancyButton` (default type="contained")
- Botão secundário → `FancyButton type="outlined"`
- Botão terciário/link → `FancyButton type="text"`
- Seleção ≤6 itens → `FancyDropDown` | >6 itens → `FancyBottomSheetSelect`
- Modal de confirmação → `FancyModalDialog`
- Modal de alerta → `FancyAlert.alert(...)`
- Wizard multi-step → `FancySteps` + `FancyStepsConfig` com `scrollableContent={false}`

## TypeScript & UI

- Zero erros TypeScript após cada mudança — `npx tsc --noEmit` é obrigatório
- Nunca usar `as any` exceto em catch blocks de API (padrão existente aceitável)
- Não usar width percentages aninhados; preferir flex para centralização
- Ao propor redesign: apresentar 2-3 direções curtas em texto ANTES de codificar, e esperar OK
  explícito antes de editar
- Bater com padrão de componente já existente no repo (ex: FancyDaySelector) em vez de inventar
  estilo novo
- Antes de criar filtro/tab/contador/chip novo: procurar se já existe componente reutilizável
  (`FancySegmentedControl`, `FancyListStats`, `FancyChips`, `FancyTabsHeader` etc.) e estender esse
  componente (prop nova, variante) em vez de duplicar a UI numa tela específica. Telas parecidas
  (ex: filtro de Voluntários vs filtro de Equipe) devem usar o mesmo componente — divergência aqui
  confunde o usuário mais do que inconsistência de código.
- Nunca adicionar scrim/overlay escuro ou animação fade-only sem pedido explícito
- Após implementar: self-review — o resultado bate com o spec? (grid está em 2 colunas? badge
  aparece?)
- Ao duvidar do padrão visual: ler um card/componente existente antes de criar algo novo

## Princípios de UX (Material Design / Apple HIG)

### Feedback imediato

- Toque em qualquer elemento interativo deve produzir resposta visual em <100ms
- Bottom sheets e modais abrem imediatamente — nunca bloquear abertura aguardando dados
- Loading dentro do container (spinner centralizado), nunca antes de abrir o container

### Estados de loading em modais/sheets

- Loading inline em row no topo = errado (parece conteúdo vazio quebrado)
- Correto: `ActivityIndicator size='large'` centralizado preenchendo a área de conteúdo, sem texto
- Padrão:
  `<View style={{ alignItems: 'center', paddingVertical: 32 }}><ActivityIndicator size='large' /></View>`

### Hierarquia de ações (botões)

- Máximo 1 ação `contained` por contexto — é o CTA principal
- Ação secundária → `outlined`; ação terciária/abandono → `text`
- `FancyAlert` com 3+ botões: primeiro sem style = `contained`, `style:'default'` = `outlined`,
  `style:'cancel'` = `text`
- Nunca dois `outlined` lado a lado quando um é abandono (Cancelar) — rebaixa para `text`

### Dismiss e controle do usuário

- Nunca bloquear fechar/sair quando o usuário ainda não comprometeu dados
- Bottom sheet: sempre pode sair (swipe, X, Cancelar) durante loading inicial
- Bloquear dismiss apenas durante submit (`closeDisabled={isSubmitting}`)

### Estados vazios

- Nunca deixar área de conteúdo em branco — sempre `FancyListEmpty` com ícone + label + helperText
- helperText deve ser instrução de ação ("Toque no botão + para adicionar"), não descrição do estado
- Ícone relevante ao contexto (não o robô padrão quando há um ícone mais específico disponível)

### Cores semânticas em ações

- Ações de CTA primário → `palette.primary` sólido
- Ações informacionais/insights → `palette.secondary` tint (withAlpha 0.14)
- Ações de configuração/ajuste → `palette.warning` tint (withAlpha 0.14)
- Ações destrutivas → `palette.error` sólido com `palette.icons.light`
- Nunca usar `palette.fonts.inactive` como cor de ação ativa — é o token de "desabilitado"

## Verificação de device/emulador

- Verificação visual usa device físico via ADB-over-WiFi (`run-diakonia.ps1`) ou tunnel fora de
  casa, com Expo dev client + hot reload. Nunca full release rebuild, nunca emulador headless.
- Nunca dirigir o dev launcher com loop de screenshot+tap por coordenada — pedir pro usuário tocar,
  ou usar deep link + screencap pra inspeção.
- Reportar caminho absoluto do screenshot/arquivo — usuário não localiza sozinho.

## Checklist antes de finalizar tela

- [ ] Cores via `usePallete()` (sem hex hardcoded)?
- [ ] Dark mode funciona?
- [ ] Touch targets ≥ 44px?
- [ ] Estados loading / erro / vazio implementados?
- [ ] Hierarquia de botões correta (contained > outlined > text)?
- [ ] Bottom sheets com loading usam spinner centralizado (não row no topo)?
- [ ] `npx tsc --noEmit` passou sem erros?

## Agent skills

### Issue tracker

Issues vivem na database Notion **Diakonia** (compartilhada com `artos-backend` e
`diakonia-public-site`). Ver `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulário padrão dos 5 papéis canônicos, mapeado pra propriedade `Triagem` do Notion (`A Triar`,
`Aguardando Informação`, `Pronta para Agente`, `Pronta para Humano`, `Não Será Feito`). Ver
`docs/agents/triage-labels.md`.

### Domain docs

Layout de contexto único (`CONTEXT.md` + `docs/adr/` na raiz). Ver `docs/agents/domain.md`.

### Processo de desenvolvimento

Todo item do tracker passa por 7 etapas obrigatórias (ler → grillar → implementar → testar →
corrigir → review → atualizar Notion), sem caminho leve. Fonte única do processo é o repo
`artos-backend`, em `docs/agents/processo-dev.md`.

### Roteiro de teste ao terminar tarefa

Ao terminar qualquer tarefa (feature, melhoria, correção), perguntar ao usuário via
`AskUserQuestion` se ele quer um roteiro de testes manual pra rodar depois. Não criar isso sem
perguntar antes — é opcional. Se ele disser que sim: usar a skill `/testing-strategy` pra gerar o
roteiro e criar uma tarefa nova na base Notion "Tarefas Diakonia" (mesma base do issue tracker) com
esse roteiro, pra ficar disponível pra rodar depois.

### Auto-auditoria pós-trabalho autônomo

Depois de uma frente de trabalho longa sem supervisão (sessão em background, Agent/fork, ou qualquer
trecho onde rodei vários passos sem check-in), antes de dar como pronto: auditar o próprio trabalho
e listar gaps que não resolvi (edge case não coberto, suposição não validada, TODO deixado, teste
que só cobre o caminho feliz etc.) — não só reportar o que funcionou. Cada gap vira um item na
database Tarefas Diakonia (`Tipo: Melhoria` ou `Bug` conforme o caso, `Status: Novo`,
`Triagem: A Triar`, `Plataforma` conforme este repo), não fica só na resposta do chat (perde na
compactação). Depois, gap por gap, via `AskUserQuestion` (uma pergunta por vez), decidir junto com o
usuário se vira issue de verdade, é ignorado, ou é falso positivo — só então corrigir.

**Atenção**: `eas.json` tem perfil por ambiente — `development`/`staging`/`e2e` apontam pro backend
de staging, só `production` aponta pro backend de produção. **Nunca** rodar
`eas build --profile production` ou `eas submit` fora do fluxo de release (código já revisado e em
`master`). Ver seção "Branches e deploy" do `processo-dev.md` (mesmo repo `artos-backend`) antes de
qualquer build/submit.

### Investigação de código (subagentes)

Pra investigações ("onde X é definido", "o que chama Y", localizar código antes de editar): usar o
skill `cavecrew-investigator` (pacote `caveman`) em vez do `Explore` padrão — saída comprimida,
economiza contexto principal. Se o harness não expuser `cavecrew-investigator` como `subagent_type`
selecionável direto na tool `Agent`, usar `Explore` ou `general-purpose` mas seguir o contrato de
saída comprimido descrito no skill `cavecrew` (path:line primeiro, símbolo entre crases, sem prosa).

Rodar esses subagentes de investigação no modelo **Haiku** (`model: "haiku"` na tool `Agent`) pra
economizar tokens — reservar Sonnet/Opus pro thread principal e pra edição/review.
