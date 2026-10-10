# Firmware ESP32 — GuiaCampus

O sketch está em [`guiacampus/guiacampus.ino`](guiacampus/guiacampus.ino), acompanhado de [`guiacampus/imu_orientation.h`](guiacampus/imu_orientation.h). Mantenha os dois arquivos juntos; o Arduino IDE exige que o arquivo `.ino` tenha o mesmo nome da pasta do sketch.

## Preparação e gravação

1. Instale o Arduino IDE e o pacote **esp32 by Espressif Systems** com suporte ao ESP32-C3.
2. Instale **Adafruit VL53L0X** e suas dependências pelo gerenciador de bibliotecas. Wire e as bibliotecas BLE usadas pelo sketch vêm do core ESP32.
3. Abra `guiacampus/guiacampus.ino`, selecione a placa correspondente ao hardware e a porta serial e compile/grave o sketch.
4. Abra o monitor serial em **115200 baud**. O dispositivo anuncia **GuiaCampus-01** por BLE.

## Pinagem e configuração

| Função | Configuração |
| --- | --- |
| I2C SDA / SCL | GPIO 6 / GPIO 7, 100 kHz |
| Sensor VL53L0X | Endereço `0x29` |
| IMU MPU6500 | Endereço `0x68` |
| Motor via transistor | GPIO 3 |
| Limiar de distância | Menor ou igual a 500 mm |
| Intensidade do motor | PWM 160/255 |

O monitor serial aceita `c` para capturar a posição neutra da IMU e `r` para remover a calibração. A calibração fica na RAM e é perdida ao reiniciar.

Consulte o [guia de integração](../web/README.md) para o protocolo BLE, procedimentos completos de calibração e limitações. Se alterar limiar ou intensidade no sketch, atualize também as constantes correspondentes em `web/src/lib/telemetry/ble-protocol.ts` (caminho relativo a `Codigo/`).

Os testes da aplicação usam BLE simulado. Compilação do sketch, gravação e validação física devem ser realizadas com as ferramentas e o hardware adequados.
