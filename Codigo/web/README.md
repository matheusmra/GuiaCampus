# GuiaCampus · Dashboard BLE

Monitoramento e diagnóstico do protótipo de óculos de navegação assistida. Next.js App Router, React, TypeScript estrito, Tailwind CSS, componentes shadcn/ui (Button/Dialog sobre Radix), Recharts, Lucide e validação Zod. Sem banco, autenticação, GPS, mapas ou IA.

## Executar

Node.js 22.12+ e npm. Execute os comandos abaixo dentro de `Codigo/web`:

```bash
npm ci
npm run dev
```

Abra http://localhost:3000. O modo **Demonstração** funciona sem hardware e sempre identifica a simulação. Nenhuma variável de ambiente é necessária. O ESP32 não usa Wi-Fi, endereço IP ou servidor HTTP.

```bash
npm test
npm run typecheck
npm run build
npm start
```

A build usa Webpack para compatibilidade com este ambiente local; o modo de desenvolvimento mantém o bundler padrão do Next.js.

## Conectar ao firmware existente

1. Ligue o ESP32 com o firmware BLE fornecido. Nome anunciado: **GuiaCampus-01** (respeitando maiúsculas/minúsculas).
2. Habilite o Bluetooth do computador e permita o acesso do navegador no sistema operacional.
3. Abra a aplicação em Chrome no macOS, Windows ou Android. A página precisa estar em **HTTPS**, ou em `localhost`/`127.0.0.1` no próprio aparelho. Um endereço HTTP da rede local não é um contexto seguro para BLE em outro aparelho.
4. Selecione **Real → Conectar BLE → GuiaCampus-01** no seletor do navegador.
5. A dashboard assina as notificações e atualiza as leituras após o primeiro pacote válido. Não é preciso parear manualmente pelo painel do sistema.

Web Bluetooth depende de navegador, plataforma, adaptador e permissões. Safari e Firefox não oferecem o fluxo usado aqui; no iPhone/iPad este MVP não oferece conexão BLE direta. Navegadores incorporados podem não disponibilizar a API: abra em Chrome externo. A página detecta ausência da API/contexto seguro e explica a limitação, mantendo a demonstração disponível. Referência: [Web Bluetooth no Chrome](https://developer.chrome.com/docs/capabilities/bluetooth).

A descoberta ocorre somente após o clique do usuário. Após uma queda, a aplicação tenta reconectar ao dispositivo já autorizado (espera progressiva de 1 a 10 s), redescobrindo o serviço e a característica. **Desconectar**, **Cancelar** e trocar de modo encerram a conexão e as tentativas. Cancelar o seletor do navegador não abre outro seletor automaticamente. Recarregar a página requer novo clique.

## Serviço e protocolo existentes

| Identificação | Valor |
| --- | --- |
| Nome BLE | `GuiaCampus-01` |
| Serviço | `7950b3d2-2bf1-4c21-9b2b-535f878a2101` |
| Característica de telemetria | `7950b3d2-2bf1-4c21-9b2b-535f878a2102` |
| Propriedades do firmware | READ e NOTIFY; dashboard usa NOTIFY |
| Formato | Exatamente 20 bytes por notificação, little-endian |
| Frequência | Intervalo de 200 ms **mais o tempo da leitura** no firmware fornecido |

Compatível com o pacote binário do firmware enviado pelo usuário. Não usa JSON no rádio, fragmentação, NimBLE nem mudança de MTU. O decoder transforma os 20 bytes no modelo tipado interno utilizado pelos componentes.

| Bytes | Campo | Decodificação |
| --- | --- | --- |
| 0–1 | Distância | `uint16`, mm; 65535 e zero são inválidos |
| 2–3, 4–5, 6–7 | Aceleração X, Y, Z | `int16 / 100`, m/s² |
| 8–9, 10–11, 12–13 | Giroscópio X, Y, Z | `int16 / 100`, °/s |
| 14–15, 16–17 | Pitch, roll | `int16 / 100`, graus |
| 18, bit 7 | Validade do MPU | 1 = válido; 0 = todos os campos da IMU indisponíveis |
| 18, bits 0–6 | RangeStatus | 0 = válido; 127 = desconhecido |
| 19 | PWM aplicado | `uint8`, 0–255; valor maior que zero indica motor ativo |

A distância só é confiável com RangeStatus zero e valor entre 1 e 65534. O bit da IMU e o RangeStatus são interpretados separadamente. Valores zerados da IMU com bit 7 desativado não são mostrados como medições reais. Pacotes com tamanho diferente de 20, valores de orientação impossíveis ou contrato inválido são rejeitados.

### Informações que o pacote não transmite

- **Uptime/timestamp do ESP32:** `timestamp_ms` interno fica `null`. Gráficos e eventos usam o horário de recebimento no navegador. A ausência de notificações válidas por 4 s sinaliza perda de telemetria. Como não há contador/timestamp no pacote, não é possível distinguir um firmware repetindo a última amostra de um dispositivo realmente parado; pacotes idênticos são aceitos.
- **WHO_AM_I:** aparece como não informado; `0x70` é o identificador esperado no sketch, não um valor recebido.
- **Configuração do limiar e PWM:** 500 mm e 160/255 vêm das constantes do firmware fornecido, e são identificados como configuração conhecida. O byte 19 carrega o PWM aplicado, que pode ser zero. Se alterar as constantes no firmware, atualize `FIRMWARE_DISTANCE_THRESHOLD_MM` e `FIRMWARE_CONFIGURED_PWM` em `src/lib/telemetry/ble-protocol.ts`.
- **Estado físico de comunicação de cada sensor:** MPU inválido ou RangeStatus 127 indicam falta de dados; não provam desconexão elétrica. O diagnóstico não inventa esse estado.
- **Causa e instante exato do acionamento:** motor ativo é inferido do PWM. A distância exibida é a leitura atual, não uma amostra histórica do acionamento.

A orientação é calculada no firmware usando o acelerômetro; a dashboard apenas representa pitch e roll. Após a calibração explícita, os ângulos são relativos à posição neutra capturada; antes dela, usam os eixos originais do sensor. Não há yaw absoluto.

## Dashboard

- Visão geral: distância, limiar, validade, orientação 2D, gráficos de distância/aceleração/giroscópio e motor.
- Diagnóstico: estados distintos para Offline, Sem dados, Operacional e Pausado; leituras inválidas do VL53L0X não geram eventos nem marcadores no gráfico, e o cartão de distância mantém a última medição válida por até 2 s; valores ausentes nunca são substituídos por zero.
- Eventos por transição de estado, sem repetir o mesmo alerta a cada pacote; até 120 registros.
- Histórico de até 5 minutos no navegador, limitado a 1.601 amostras para a cadência BLE de aproximadamente 5 Hz. Trocar de modo/recarregar limpa a sessão.
- Pausa congela a coleta exibida, sem comandar o ESP32. O link BLE pode permanecer conectado; os pacotes recebidos durante a pausa são ignorados pela visualização.
- Offline/pausa removem os valores dos cards atuais. O diagnóstico mantém os últimos valores identificados pelo estado; gráficos preservam histórico e interrompem linhas em lacunas maiores que 3 s.
- Exportação CSV identifica o modo, fonte de configuração, horário ISO de recebimento e unidades. Distância inválida e uptime inexistente ficam vazios.
- Demonstração com dados explicitamente simulados, pré-preenchimento de cerca de um minuto e cenários de obstáculo, leitura inválida, sensor sem dados e dispositivo offline.

O limiar usa **menor ou igual a 500 mm**, como o firmware. O motor do firmware fornecido **desliga quando a distância é inválida**; a dashboard preserva esse comportamento e mostra **risco desconhecido**, nunca ausência de risco. Não há escrita em características para controlar o motor.

## Firmware

`../esp32/guiacampus/guiacampus.ino` é o firmware fornecido com a correção de leitura ordenada dos bytes e calibração opcional da IMU. O arquivo `imu_orientation.h` fica na mesma pasta do sketch. Grave o sketch atualizado para usar a calibração.

- Arduino IDE, pacote **esp32 by Espressif Systems** com suporte ao ESP32-C3 e biblioteca **Adafruit VL53L0X** (+ dependências). BLEDevice/BLEServer/BLEUtils/BLE2902 são do core ESP32; não instalar NimBLE para este sketch.
- I2C a 100 kHz: SDA GPIO 6, SCL GPIO 7. VL53L0X `0x29`, LONG_RANGE; MPU6500 `0x68`, WHO_AM_I esperado `0x70`, ±2 g / ±250 °/s.
- Motor via circuito de transistor no GPIO 3, `analogWrite`, limiar inclusivo de 500 mm, intensidade 160. Controle antes da transmissão e independente da presença do cliente BLE.
- Leituras a cada 200 ms após a conclusão da anterior; `rangingTest` e notificações executam no loop original. Não é prometido tempo real rígido nem isolamento em outra tarefa. O reanúncio após desconexão usa o comportamento original, com atraso de 50 ms.
- Se um sensor falhar na inicialização, este sketch mantém a indisponibilidade até reiniciar. A dashboard reconecta BLE, mas não reinicializa os sensores.

A máquina de desenvolvimento não possui placa conectada nem Arduino CLI. Compilação, gravação e temporização física do firmware permanecem pendentes. Na bancada, confirmar medidas/eixos, limiar a 500 mm, leitura inválida, perda e retorno do BLE, anúncios e continuidade do motor com a dashboard fechada. Esta ferramenta monitora o protótipo e não substitui seus mecanismos físicos de segurança.

## Alertas sonoros e detecção de queda

- **Som:** o botão **Som desativado/ativado** no topo da página liga beeps no navegador (Web Audio, exige um clique para liberar o áudio). Um beep curto toca no início de cada obstáculo detectado; uma sequência de quatro pares de tons toca em caso de possível queda.
- **Queda:** `src/lib/telemetry/fall.ts` usa o acelerômetro e o giroscópio do MPU6500. Um gatilho (aceleração >= 16 m/s², queda livre <= 3 m/s² ou giro >= 180 °/s) só vira alerta se, em até 4 s, o dispositivo se estabilizar (aceleração entre 7 e 13 m/s², giro < 60 °/s) com mudança de inclinação >= 45° em relação à postura anterior. Após um alerta há uma pausa de 10 s. Um banner vermelho aparece na dashboard e o evento é registrado no histórico.
- **Limitações:** o pacote chega a cada ~200 ms e o MPU opera em +-2 g / +-250 °/s, então impactos saturam perto de 19,6 m/s² e fases curtas de queda livre podem passar despercebidas. Retirar os óculos bruscamente ou apoiá-los de lado pode gerar falso positivo. É um indicador de **possível** queda, não uma função de segurança certificada; os limiares exigem ajuste com testes reais. O cenário **Queda simulada** da demonstração valida o fluxo.

## Organização e validação

```text
src/components/dashboard/       Layout, gráficos, diagnóstico e eventos
src/components/ui/              Button e Dialog shadcn/ui / Radix
src/hooks/use-telemetry.ts        BLE/demonstração, coleta, memória e watchdog
src/lib/telemetry/ble-protocol.ts Decoder exato do pacote binário do firmware
src/lib/telemetry/ble-client.ts   Seleção, assinatura, reconexão e limpeza GATT
src/lib/telemetry/validation.ts   Validação do modelo interno
../esp32/guiacampus/                Firmware BLE e orientação da IMU
tests/                          Protocolo binário, ciclo BLE, contrato e eventos
```

Testes automatizados usam adaptadores GATT simulados (sem acessar o rádio): nome/UUIDs, bytes little-endian, sinal/escala, bits de validade, sentinelas, tamanhos incorretos, cancelamento, queda/reconexão e limpeza. Não substituem o teste físico com o ESP32 e um navegador compatível.


## Calibrar a posição neutra da IMU

Parado não significa nivelado nos eixos do chip. A fórmula original espera gravidade em +Z: na captura de teste, aceleração `(9,82; 0,45; -1,28)` m/s² produz pitch −82,13° e roll 160,63°. Esses ângulos são do **acelerômetro**, não integração do giroscópio. A montagem está perto da vertical do eixo X; isso não comprova defeito no sensor. [Referência de inclinação por gravidade (NXP AN3461)](https://www.nxp.com/docs/en/application-note/AN3461.pdf).

1. Grave `../esp32/guiacampus/guiacampus.ino` com `imu_orientation.h` na mesma pasta.
2. Abra o monitor serial em **115200 baud**, apoie o protótipo na posição que deve representar a cabeça neutra e aguarde estabilizar.
3. Envie **c**. Mantenha o dispositivo imóvel até aparecer **Calibracao concluida**: são 40 leituras, aproximadamente 10 s. Amostras instáveis, movimento detectado ou falha I2C cancelam/rejeitam a tentativa sem apagar a última calibração válida.
4. Pitch e roll devem ficar próximos de zero nessa posição. Incline separadamente para conferir o sentido dos eixos na montagem física. Não há determinação de direção anatômica/frente nem yaw a partir de uma posição estática.
5. **r** remove a calibração. Reiniciar também remove: ela fica somente na RAM e nunca ocorre automaticamente durante o uso.

A referência transforma o vetor de gravidade antes do cálculo dos ângulos; não subtrai dois ângulos Euler, o que falharia perto das descontinuidades. Os gráficos de aceleração continuam nos eixos físicos do sensor, com a gravidade presente. A média do giroscópio parado é subtraída como offset nos três eixos, sem integrar o giro na orientação. Não é uma calibração completa em seis posições nem compensação térmica. Os limites de movimento são uma verificação prática de estabilidade; não substituem manter o aparelho imóvel.

O pacote BLE permanece com 20 bytes, mesmos UUIDs e unidades. Não há bit indicando calibração nesse protocolo; o resultado é confirmado no monitor serial. O controle do motor e a inicialização do VL53L0X não foram alterados. O código evita chamadas múltiplas a `Wire.read()` na mesma expressão, garantindo byte alto/baixo em ordem explícita.

O teste C++ de orientação mencionado na documentação original não está presente nesta cópia do projeto. A validação do firmware em bancada permanece pendente.
