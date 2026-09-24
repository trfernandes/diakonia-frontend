# Roteiros Maestro — ADR-0012: Escopo de Indisponibilidade por Ministério/Função

Testes E2E automatizados para a feature de indisponibilidades com escopo (ministério + função).

## Pré-requisitos

- **Celular Android USB**: conectado ao PC via ADB
- **Expo dev client**: instalado no celular, build `com.church.artos`
- **Metro rodando**: `cd D:\artos\artos_frontend_dev && npx expo start --dev-client` na outra worktree
- **Usuária logada**: Mirian (líder do ministério Louvor, BeOne Church)
- **Tela desbloqueada**: sem proteção por senha/PIN
- **PC não pode suspender**: durante os testes

## Roteiros disponíveis

### 1. `01-data-avulsa-escopo.yaml`
Marca um dia como indisponível com 2 funções específicas, verifica persistência, remove funções, desativa o dia.

**Validações:**
- Sheet de "Onde vale" mostra apenas Louvor (sem Hub para Mirian)
- Funções selecionadas aparecem no resumo do dia
- Remover todas as funções volta a "Todos os ministérios"
- Dia completamente desmarcado volta ao calendário normal

### 2. `02-periodo-escopo.yaml`
Cria período de 3 dias com 1 função, verifica, remove.

**Validações:**
- Período salvo com função específica
- Reabertura mostra função selecionada
- Remoção limpa o calendário

### 3. `03-regra-lider-escopo.yaml`
Tela do líder: cria regra semanal (segunda) com 1 função, verifica card, abre/edita, remove.

**Validações:**
- Seletor "Buscar voluntário" abre como sheet, não navega
- Card da regra aparece na lista
- Edição preserva função selecionada
- Remoção com confirmação funciona

### 4. `04-regra-pessoal-escopo.yaml`
Minhas Indisponibilidades > Regras: cria regra terça com 1 função, verifica, remove.

**Validações:**
- Regra recorrente salva com escopo
- Reabertura mostra função
- Remoção funciona

## Rodar um roteiro isolado

```bash
node artos_frontend_dev/maestro/nav.js adr0012/01-data-avulsa-escopo
```

Ou via Maestro CLI direto:
```bash
maestro --device <SERIAL> test maestro/flows/adr0012/01-data-avulsa-escopo.yaml
```

## Rodar a suite completa

```bash
maestro --device <SERIAL> test maestro/flows/adr0012/_suite.yaml
```

## Rodar noite inteira em loop

Script PowerShell `maestro/run-noite.ps1`:
```powershell
D:\artos\artos_frontend_dev\maestro\run-noite.ps1 -Device RQCWC04P4VX -Iteracoes 10
```

Cuida de:
- Verificar `adb devices` e Maestro instalado
- Configurar `adb reverse` para Metro em `localhost:8081`
- Acordar backend staging
- Rodar cada flow com saída XML (JUnit format)
- Compilar resumo CSV + TXT

Resultados em: `maestro/results/<timestamp>/`

## Limitações conhecidas

1. **Datas calculadas via `runScript`**: usar de dia 15+ do mês; evita passado em loops
2. **Swipe para revelar lixeira**: pode não funcionar se componente tem padding diferente — fallback: procurar ícone visível sem swipe
3. **Sheet de busca de voluntário**: comportamento exato depende se há voluntários cadastrados no ministério
4. **Dark mode**: roteiros testados em light theme; dark mode exige ajustes em cores de assertion (se houver)
5. **Timeouts**: aumentar `waitForAnimationToEnd` se o Metro está lento (rede, VM, etc.)

## Estrutura

```
maestro/flows/adr0012/
├── 01-data-avulsa-escopo.yaml
├── 02-periodo-escopo.yaml
├── 03-regra-lider-escopo.yaml
├── 04-regra-pessoal-escopo.yaml
├── _suite.yaml
└── README.md (este arquivo)

maestro/results/              ← gerado ao rodar suite
└── <yyyyMMdd-HHmm>/
    ├── resumo.csv
    ├── resumo.txt
    └── <iteracao>/<flow>/...xml
```

## Debugging

Se um roteiro falhar:
1. Checar app está aberto: `adb shell am start -n com.church.artos/.MainActivity`
2. Checar Metro: `curl http://localhost:8081/status` (no PC)
3. Aumentar timeouts em YAML (ex. `5000` → `8000`)
4. Screenshot manual: `maestro screenshot --device <SERIAL> > /tmp/screen.png`
5. Logs Maestro: `--verbose` ou `--debug` na CLI

## Contato

Feature: ADR-0012 (Escopo Indisponibilidade)
Repo: `artos_frontend_dev` (branch `feat/indisponibilidade-multi-ministerio`)
