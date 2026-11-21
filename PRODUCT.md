# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Usuario primario:** Pessoas com deficiencia visual que utilizam o prototipo de oculos assistivos **GuiaCampus** (e/ou acompanhantes que auxiliam na operacao), acessando a central web no navegador (Chrome em computador ou Android) para conectar os oculos via BLE, acompanhar com clareza o estado da conexao, os alertas de obstaculos e o acionamento do motor, e registrar ou exportar sessoes de uso.
- **Usuario secundario:** Equipe de desenvolvimento e professores/banca da disciplina TI5, utilizando o modo Demonstracao, o historico de eventos, os graficos de sensores e a exportacao CSV para diagnostico tecnico, depuracao do firmware e apresentacao academica.
- **Publico da visao futura (fora do escopo do MVP atual):** Instituicoes (como administracoes de campus universitario) que utilizariam um mapa interativo de obstaculos detectados para priorizar manutencao e acessibilidade fisica.

## Product Purpose

- **O que o produto faz:** Fornece uma central web em `pt-BR` (`Codigo/web`) para acompanhar em tempo real a telemetria do prototipo vestivel **GuiaCampus** via Web Bluetooth (`GuiaCampus-01`) e permitir demonstracao completa sem hardware pelo modo **Demonstracao**.
- **Por que existe:** A bengala tradicional nao detecta obstaculos suspensos ou na altura da cabeca. Os oculos atuam como um "para-choque virtual" autonomo por vibracao; a central web aproxima quem usa os oculos (e quem acompanha ou avalia o prototipo) do estado real da operacao, traduzindo pacotes binarios BLE em informacao clara, acessivel e auditavel.
- **O que significa sucesso:** Permitir conexao BLE simples e confiavel em Chrome (desktop/Android) com leitura imediata e acessivel do estado da conexao, distancia/alerta de obstaculo e atuador haptico — sem jamais mascarar leituras invalidas ou substituir a seguranca fisica do dispositivo —, alem de suportar demonstracao academica e exportacao fiel de sessoes em CSV.

## Positioning

Diferente de paineis IoT genericos que dependem de Wi-Fi, servidor ou aplicativo nativo, a central **GuiaCampus** conecta-se diretamente do navegador ao ESP32-C3 por Web Bluetooth sobre um pacote binario fixo de 20 bytes, mantendo os alertas fisicos 100% autonomos no hardware e colocando honestidade de telemetria e acessibilidade para pessoas com deficiencia visual como requisitos de primeira classe.

## Operating Context

- **Ambiente de execucao:** Navegador Chrome em desktop (macOS/Windows) ou Android sobre **HTTPS** ou `localhost`/`127.0.0.1` para o modo **Real** (Web Bluetooth). Safari, Firefox e iOS/iPadOS nao oferecem suporte ao fluxo BLE usado aqui; a aplicacao deve detectar a ausencia da API ou de contexto seguro, explicar a limitacao e manter o modo **Demonstracao** funcional.
- **Hardware pareado no MVP atual:** Microcontrolador `ESP32-C3 SuperMini` anunciando o nome BLE `GuiaCampus-01`, `1x VL53L0X` (sensor ToF, I2C `0x29`), `1x MPU6500` (IMU de 6 eixos, I2C `0x68`) e `1x Coin Motor 1027` (atuador haptico no GPIO 3).
- **Fluxos reais de operacao:**
  - Descoberta e pareamento BLE ocorrem apenas apos acao explicita do usuario; apos queda, a central tenta reconexao progressiva (1 a 10 s) ao dispositivo ja autorizado.
  - Perda de notificacoes validas por mais de 4 s sinaliza indisponibilidade de telemetria.
  - A pausa congela apenas a exibicao no navegador, sem comandar o ESP32.
  - A calibracao da posicao neutra da IMU ocorre opcionalmente pelo monitor serial (`c` para calibrar, `r` para limpar), fica apenas em RAM e e perdida ao reiniciar.
  - Exportacao de sessao em CSV (`guiacampus-{modo}-{data}.csv`) preservando modo, horario ISO de recebimento, origem da configuracao e campos vazios para valores ausentes/invalidos.
  - Contexto academico: trabalho interdisciplinar (TI5 — Ciencia da Computacao), conduzido por equipe de 5 alunos sob orientacao de 4 professores.

## Capabilities and Constraints

### Escopo confirmado (MVP BLE atual)

- Protocolo BLE somente leitura (`NOTIFY`; servico `7950b3d2-2bf1-4c21-9b2b-535f878a2101`, caracteristica `7950b3d2-2bf1-4c21-9b2b-535f878a2102`), pacote binario little-endian de 20 bytes a ~5 Hz (`200 ms` + tempo de leitura).
- Monitoramento de distancia (`VL53L0X`, limiar inclusivo `<= 500 mm`), orientacao 2D (`pitch` e `roll` calculados no firmware pelo acelerometro do `MPU6500`), graficos de distancia, aceleracao e giroscopio, e estado do `Coin Motor 1027` (PWM aplicado recebido no byte 19; constantes conhecidas do firmware: `500 mm` e PWM `160/255`).
- Modo **Demonstracao** sempre identificado como simulacao, com pre-preenchimento inicial e cenarios (automatico, obstaculo proximo, medicao invalida `RangeStatus 4`, sensor indisponivel e dispositivo offline).
- Historico temporario em memoria na sessao (ate 5 min / 1.601 amostras; ate 120 eventos gerados por transicao de estado) e exportacao CSV.

### Restricoes inegociaveis de seguranca e dados

- **Apenas monitoramento:** a central web nao envia comandos ao ESP32, nao escreve em caracteristicas BLE para acionar o motor e nao substitui os mecanismos fisicos de seguranca dos oculos.
- **Leitura invalida significa risco desconhecido:** o motor desliga no firmware quando a distancia e invalida (`RangeStatus != 0`, valor `0` ou `65535`); a interface deve apresentar risco desconhecido ou medicao indisponivel, nunca ausencia de risco.
- **Sem zeragem artificial:** valores ausentes ou invalidos do `VL53L0X` ou do `MPU6500` (bit 7 desativado) nunca devem ser substituidos por zero nem exibidos como medicoes reais.
- **Sem infraestrutura externa neste MVP:** sem banco de dados, autenticacao, GPS, mapas, IA, Wi-Fi, IP ou servidor HTTP no ESP32.

### Fora do escopo do MVP atual

- Mapa interativo de localizacao de obstaculos para manutencao institucional no campus (visao futura; fora do MVP BLE atual por nao haver GPS nem backend nesta versao).
- Alertas sonoros no navegador (removidos no commit `ebf45d1f`), interface de deteccao de queda (`Codigo/web/src/lib/telemetry/fall.ts` permanece no repositorio, mas fora do escopo ativo do MVP), painel dedicado de diagnostico de hardware (`Codigo/web/src/components/dashboard/device-health.tsx` nao integrado) e extensoes descritas apenas como visao ampla no `README.md` raiz (`3x VL53L0X`, `MPU6050`, FreeRTOS multitarefa e nuvem via Wi-Fi/MQTT).

### Terminologia de dominio

- `GuiaCampus`, `GuiaCampus-01`, modo `Real`, modo `Demonstracao`, `VL53L0X`, `MPU6500`, `Coin Motor 1027`, `RangeStatus`, `PWM`, `pitch` e `roll`.

## Brand Commitments

- **Nome oficial:** `GuiaCampus` (identificador BLE anunciado: `GuiaCampus-01`).
- **Idioma da interface:** Portugues do Brasil (`pt-BR`).
- **Voz do produto:** Clara, direta, acolhedora e rigorosamente honesta sobre incertezas de medicao e limites do prototipo; nunca promete seguranca certificada.
- **Compromissos em aberto:** Nenhum compromisso visual vinculante foi travado neste `init` (o subtitulo `"TECNOLOGIA QUE GUIA"` existe na interface atual, mas nao foi definido como obrigatorio).

## Evidence on Hand

### Disponivel no repositorio

- Aplicacao web funcional em `Codigo/web` (Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui + Radix, Recharts, Zod) com modo **Demonstracao** simulado.
- Suite de testes automatizados Vitest com adaptadores GATT simulados em `Codigo/web/tests/` (`ble-protocol.test.ts`, `ble-client.test.ts`, `telemetry.test.ts`, `fall.test.ts`).
- Firmware BLE do prototipo em `Codigo/esp32/guiacampus/guiacampus.ino` e `Codigo/esp32/guiacampus/imu_orientation.h`.
- Documentacao de arquitetura, contrato BLE e calibracao em `README.md`, `Codigo/web/README.md` e `Codigo/esp32/README.md`.
- Cinco artigos cientificos de referencia bibliografica em `Documentacao/*.pdf`.

### Ausencias explicitas (nao fabricar em trabalhos futuros)

- Compilacao final em placa, validacao fisica em bancada e testes de campo com usuarios reais permanecem pendentes (`Artefatos/experimentos/esp32-ble-2026-10-15` e `Artefatos/artigo-sbc` estao vazios; `Documentacao/01-contexto-problema-justificativa.md` e `Documentacao/02-escopo-requisitos.md` ainda sao modelos em branco).
- Nao ha depoimentos de usuarios, resultados clinicos, taxas medidas de deteccao em campo, fotografias reais do prototipo nem dados georreferenciados no repositorio.

## Product Principles

1. **Usuario dos oculos primeiro, diagnostico tecnico em segundo plano:** Priorizar entendimento imediato de conexao, proximidade de obstaculo e estado operacional para quem veste ou acompanha os oculos, deixando metricas brutas de sensores em papel secundario.
2. **Honestidade radical diante de falhas e incerteza:** Nunca exibir leitura invalida como caminho seguro, nunca preencher dado ausente com zero e manter visivel que o alerta haptico opera de forma autonoma no hardware.
3. **Acessibilidade como requisito estrutural:** Todo fluxo principal (conectar BLE, alternar modo, pausar, compreender alertas, consultar eventos e exportar CSV) deve funcionar integralmente por teclado e leitor de tela.
4. **Fronteira explicita entre real e simulado:** Identificar sempre o modo Demonstracao e distinguir constantes conhecidas do firmware de valores efetivamente transmitidos pelo pacote BLE.
5. **Fidelidade ao escopo entregue hoje sem perder a visao:** Projetar com precisao para o contrato BLE de 20 bytes atual, sem simular GPS, mapas ou nuvem inexistentes, preservando clareza sobre a visao futura de mapeamento institucional.

## Accessibility & Inclusion

- **Padrao alvo confirmado:** **WCAG 2.1 nivel AA**.
- **Requisitos essenciais:**
  - Navegacao completa por teclado em todos os controles, dialogos e filtros, com ordem logica de foco e indicador de foco claramente visivel.
  - Semantica HTML e hierarquia de cabecalhos/landmarks adequadas para leitores de tela (NVDA, VoiceOver, TalkBack), com rotulos programaticos claros para leituras de sensores, graficos e controles.
  - Regioes ARIA (`aria-live` / `role="alert"` / `role="status"`) calibradas para anunciar transicoes criticas (conexao/queda BLE, obstaculo proximo, leitura invalida, perda de telemetria) sem inundar o leitor de tela a cada pacote de 200 ms.
  - Comunicacao de estado e alerta nunca dependente apenas de cor (sempre acompanhada de texto claro e semantica).
  - Respeito a `prefers-reduced-motion`.
