
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <math.h>
#include "imu_orientation.h"

// ==========================================
// 1. CONFIGURACOES DO GUIACAMPUS
// ==========================================

#define MPU_ADDR 0x68

const int SDA_PIN = 6;
const int SCL_PIN = 7;
const int MOTOR_PIN = 3;

// Configuracoes originais
const int DISTANCIA_LIMITE = 500; // 50 cm
const int INTENSIDADE_MOTOR = 160; // PWM 0-255

const unsigned long INTERVALO_LEITURA = 200;

// ==========================================
// 2. CONFIGURACOES BLUETOOTH BLE
// ==========================================

#define BLE_NAME "GuiaCampus-01"

#define SERVICE_UUID \
  "7950b3d2-2bf1-4c21-9b2b-535f878a2101"

#define TELEMETRY_UUID \
  "7950b3d2-2bf1-4c21-9b2b-535f878a2102"

BLEServer* bleServer = nullptr;
BLECharacteristic* telemetryCharacteristic = nullptr;

volatile bool bluetoothConectado = false;
bool bluetoothConectadoAnteriormente = false;

class GuiaCampusBLECallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    bluetoothConectado = true;
  }

  void onDisconnect(BLEServer* server) override {
    bluetoothConectado = false;
  }
};

// ==========================================
// 3. VARIAVEIS DOS SENSORES
// ==========================================

Adafruit_VL53L0X lox;

bool vlDisponivel = false;
bool mpuDisponivel = false;

bool distanciaValida = false;
bool movimentoValido = false;
bool motorAtivo = false;

uint16_t distanciaMM = 0;
int rangeStatus = -1;
int pwmAtual = 0;

float ax = 0, ay = 0, az = 0;
float gx = 0, gy = 0, gz = 0;

float pitch = 0;
float roll = 0;

guiacampus::ImuOrientation orientacaoMPU;

unsigned long ultimaLeitura = 0;

// ==========================================
// 4. FUNCOES DO MPU6500
// ==========================================

bool escreverMPU(uint8_t reg, uint8_t valor) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(valor);

  return Wire.endTransmission() == 0;
}

// Identifica e configura o MPU6500
bool iniciarMPU() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x75); // WHO_AM_I

  if (Wire.endTransmission(false) != 0) {
    return false;
  }

  if (Wire.requestFrom(MPU_ADDR, 1) != 1) {
    return false;
  }

  uint8_t id = Wire.read();

  Serial.print("MPU WHO_AM_I: 0x");
  Serial.println(id, HEX);

  // Nosso modulo retornou 0x70
  if (id != 0x70) {
    return false;
  }

  // Acorda o MPU6500
  if (!escreverMPU(0x6B, 0x01)) {
    return false;
  }

  delay(100);

  // Acelerometro: +-2g
  if (!escreverMPU(0x1C, 0x00)) {
    return false;
  }

  // Giroscopio: +-250 graus/s
  if (!escreverMPU(0x1B, 0x00)) {
    return false;
  }

  // Filtro passa-baixa
  if (!escreverMPU(0x1A, 0x03)) {
    return false;
  }

  return true;
}

// Le os registradores do MPU6500
bool lerMPU() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);

  if (Wire.endTransmission(false) != 0) {
    return false;
  }

  if (Wire.requestFrom(MPU_ADDR, 14) != 14) {
    return false;
  }

  // Consome os bytes em ordem explicita. Duas chamadas Wire.read() na
  // mesma expressao bitwise nao garantem a ordem de consumo dos bytes.
  uint8_t raw[14];
  for (uint8_t i = 0; i < sizeof(raw); ++i) raw[i] = Wire.read();
  const int16_t rawAX = guiacampus::ImuOrientation::signedBigEndian(raw);
  const int16_t rawAY = guiacampus::ImuOrientation::signedBigEndian(raw + 2);
  const int16_t rawAZ = guiacampus::ImuOrientation::signedBigEndian(raw + 4);
  // raw[6..7]: temperatura, nao utilizada.
  const int16_t rawGX = guiacampus::ImuOrientation::signedBigEndian(raw + 8);
  const int16_t rawGY = guiacampus::ImuOrientation::signedBigEndian(raw + 10);
  const int16_t rawGZ = guiacampus::ImuOrientation::signedBigEndian(raw + 12);

  // Aceleracao em m/s2
  ax = rawAX / 16384.0 * 9.80665;
  ay = rawAY / 16384.0 * 9.80665;
  az = rawAZ / 16384.0 * 9.80665;

  // Giroscopio em graus/s
  gx = rawGX / 131.0;
  gy = rawGY / 131.0;
  gz = rawGZ / 131.0;

  // Calibracao explicita (Serial 'c'), acumulada nas leituras normais.
  // Nao adiciona delay nem espera bloqueante ao controle local do motor.
  const guiacampus::Vector3 acceleration{ax, ay, az};
  const guiacampus::Vector3 rawGyro{gx, gy, gz};
  const auto result = orientacaoMPU.addCalibrationSample(acceleration, rawGyro);
  if (result == guiacampus::CalibrationResult::Accepted) {
    Serial.println("Calibracao concluida: posicao neutra e offsets do giroscopio definidos.");
    const auto bias = orientacaoMPU.gyroBias();
    Serial.print("Offsets (graus/s): "); Serial.print(bias.x);
    Serial.print(", "); Serial.print(bias.y); Serial.print(", "); Serial.println(bias.z);
  } else if (result == guiacampus::CalibrationResult::Rejected) {
    Serial.println("Calibracao rejeitada: movimento ou amostras instaveis. Mantenha imovel e envie c novamente.");
  }
  const auto corrected = orientacaoMPU.correctedGyro(rawGyro);
  gx = corrected.x; gy = corrected.y; gz = corrected.z;
  const auto tilt = orientacaoMPU.orientation(acceleration);
  pitch = tilt.pitch; roll = tilt.roll;

  return true;
}

// ==========================================
// 5. CONTROLE DO MOTOR E SENSORES
// ==========================================

void desligarMotor() {
  pwmAtual = 0;
  motorAtivo = false;
  analogWrite(MOTOR_PIN, 0);
}

void atualizarSensores() {
  Serial.println("------------------------");

  // ================================
  // VL53L0X
  // ================================

  distanciaValida = false;
  rangeStatus = -1;

  if (vlDisponivel) {
    VL53L0X_RangingMeasurementData_t medida = {};

    VL53L0X_Error erro =
      lox.rangingTest(&medida, false);

    if (erro == VL53L0X_ERROR_NONE) {
      rangeStatus = medida.RangeStatus;
    }

    distanciaValida =
      erro == VL53L0X_ERROR_NONE &&
      medida.RangeStatus == 0 &&
      medida.RangeMilliMeter > 0 &&
      medida.RangeMilliMeter < 65535;

    if (distanciaValida) {
      distanciaMM = medida.RangeMilliMeter;
    }
  }

  if (distanciaValida) {
    Serial.print("Distancia: ");
    Serial.print(distanciaMM / 10.0);
    Serial.println(" cm");

    // Mantem a regra original
    if (distanciaMM <= DISTANCIA_LIMITE) {
      pwmAtual = INTENSIDADE_MOTOR;
      motorAtivo = true;

      analogWrite(MOTOR_PIN, pwmAtual);

      Serial.println("ALERTA: OBSTACULO!");
      Serial.print("PWM: ");
      Serial.println(pwmAtual);
    } else {
      desligarMotor();
      Serial.println("Sem obstaculo proximo");
    }
  } else {
    distanciaMM = 0;
    desligarMotor();

    Serial.print("Leitura VL53L0X invalida! Status: ");
    Serial.println(rangeStatus);
  }

  // ================================
  // MPU6500
  // ================================

  movimentoValido = false;

  if (mpuDisponivel) {
    movimentoValido = lerMPU();

    if (movimentoValido) {
      Serial.print("Pitch: ");
      Serial.print(pitch);
      Serial.println(" graus");

      Serial.print("Roll: ");
      Serial.print(roll);
      Serial.println(" graus");

      Serial.print("Giro X: ");
      Serial.print(gx);
      Serial.println(" graus/s");

      Serial.print("Giro Y: ");
      Serial.print(gy);
      Serial.println(" graus/s");

      Serial.print("Giro Z: ");
      Serial.print(gz);
      Serial.println(" graus/s");
    } else {
      Serial.println("Erro na leitura MPU6500!");
      if (orientacaoMPU.collecting()) {
        orientacaoMPU.cancelCalibration();
        Serial.println("Calibracao cancelada: leitura interrompida. Envie c para tentar novamente.");
      }
    }
  }

  ultimaLeitura = millis();
}

// ==========================================
// 6. CODIFICACAO DE TELEMETRIA BLE
// ==========================================

// Converte valores para int16 com escala x100
// e evita ultrapassar os limites do tipo.
int16_t quantizar(float valor) {
  if (!isfinite(valor)) {
    return 0;
  }

  long convertido = lroundf(valor * 100.0f);

  if (convertido > 32767) convertido = 32767;
  if (convertido < -32768) convertido = -32768;

  return (int16_t)convertido;
}

// Grava 16 bits em little-endian.
void colocar16(uint8_t* pacote,
               int posicao,
               uint16_t valor) {

  pacote[posicao] = valor & 0xFF;
  pacote[posicao + 1] = (valor >> 8) & 0xFF;
}

// Gera um pacote de exatamente 20 bytes.
//
//  0-1: distancia (mm)
//  2-3: aceleracao X * 100
//  4-5: aceleracao Y * 100
//  6-7: aceleracao Z * 100
//  8-9: giroscopio X * 100
// 10-11: giroscopio Y * 100
// 12-13: giroscopio Z * 100
// 14-15: pitch * 100
// 16-17: roll * 100
//    18: status + MPU valido
//    19: PWM do motor
//
// Valores int16 sao little-endian.
// Distancia 65535 indica leitura invalida.
// No byte 18:
//   bit 7 = MPU valido
//   bits 0-6 = RangeStatus
//   valor 127 = status VL desconhecido

void montarPacote(uint8_t* pacote) {
  uint16_t distancia =
    distanciaValida ? distanciaMM : 65535;

  colocar16(pacote, 0, distancia);

  colocar16(pacote, 2,
    (uint16_t)quantizar(movimentoValido ? ax : 0));

  colocar16(pacote, 4,
    (uint16_t)quantizar(movimentoValido ? ay : 0));

  colocar16(pacote, 6,
    (uint16_t)quantizar(movimentoValido ? az : 0));

  colocar16(pacote, 8,
    (uint16_t)quantizar(movimentoValido ? gx : 0));

  colocar16(pacote, 10,
    (uint16_t)quantizar(movimentoValido ? gy : 0));

  colocar16(pacote, 12,
    (uint16_t)quantizar(movimentoValido ? gz : 0));

  colocar16(pacote, 14,
    (uint16_t)quantizar(movimentoValido ? pitch : 0));

  colocar16(pacote, 16,
    (uint16_t)quantizar(movimentoValido ? roll : 0));

  uint8_t status =
    (rangeStatus >= 0 && rangeStatus <= 126)
      ? (uint8_t)rangeStatus
      : 127;

  pacote[18] =
    status | (movimentoValido ? 0x80 : 0);

  pacote[19] = (uint8_t)pwmAtual;
}

// ==========================================
// 7. SERVIDOR BLUETOOTH
// ==========================================

void iniciarBLE() {
  Serial.println("Iniciando Bluetooth BLE...");

  BLEDevice::init(BLE_NAME);

  bleServer = BLEDevice::createServer();

  bleServer->setCallbacks(
    new GuiaCampusBLECallbacks()
  );

  BLEService* service =
    bleServer->createService(SERVICE_UUID);

  telemetryCharacteristic =
    service->createCharacteristic(
      TELEMETRY_UUID,
      BLECharacteristic::PROPERTY_READ |
      BLECharacteristic::PROPERTY_NOTIFY
    );

  // Permite inscricao nas notificacoes
  telemetryCharacteristic->addDescriptor(
    new BLE2902()
  );

  // Disponibiliza um pacote inicial
  uint8_t pacoteInicial[20] = {};

  pacoteInicial[0] = 0xFF;
  pacoteInicial[1] = 0xFF;
  pacoteInicial[18] = 127;

  telemetryCharacteristic->setValue(
    pacoteInicial,
    sizeof(pacoteInicial)
  );

  service->start();

  BLEAdvertising* advertising =
    BLEDevice::getAdvertising();

  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);

  BLEDevice::startAdvertising();

  Serial.println("Bluetooth iniciado!");
  Serial.println("Nome: GuiaCampus-01");
  Serial.println("Aguardando conexao BLE...");
}

void enviarTelemetriaBLE() {
  if (!bluetoothConectado ||
      telemetryCharacteristic == nullptr) {
    return;
  }

  uint8_t pacote[20] = {};

  montarPacote(pacote);

  telemetryCharacteristic->setValue(
    pacote,
    sizeof(pacote)
  );

  telemetryCharacteristic->notify();
}

// ==========================================
// 8. SETUP
// ==========================================

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("================================");
  Serial.println("       GUIACAMPUS IoT");
  Serial.println("================================");

  // Motor inicialmente desligado
  pinMode(MOTOR_PIN, OUTPUT);
  desligarMotor();

  // Barramento I2C compartilhado
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  Serial.println("Iniciando sensores...");

  // VL53L0X - LONG RANGE
  vlDisponivel = lox.begin(
    0x29,
    false,
    &Wire,
    Adafruit_VL53L0X::VL53L0X_SENSE_LONG_RANGE
  );

  if (vlDisponivel) {
    Serial.println("VL53L0X conectado!");
  } else {
    Serial.println("ERRO: VL53L0X indisponivel!");
    // BLE continua funcionando para diagnostico
  }

  // MPU6500
  mpuDisponivel = iniciarMPU();

  if (mpuDisponivel) {
    Serial.println("MPU6500 conectado!");
  } else {
    Serial.println("ERRO: MPU6500 indisponivel!");
  }

  // Inicializa comunicacao BLE
  iniciarBLE();

  ultimaLeitura = millis();

  Serial.println("GuiaCampus pronto!");
  Serial.println("IMU: apoie na posicao neutra, mantenha imovel e envie c no Serial para calibrar (~10 s).");
  Serial.println("Envie r para restaurar a referencia original dos eixos. Calibracao dura ate reiniciar.");
}

// ==========================================
// 9. LOOP PRINCIPAL
// ==========================================

void loop() {
  // Consome no maximo um caractere por iteracao, sem bloquear os sensores.
  if (Serial.available()) {
    const char command = Serial.read();
    if ((command == 'c' || command == 'C') && mpuDisponivel) {
      orientacaoMPU.beginCalibration();
      Serial.println("Calibrando 40 leituras. Nao mova o dispositivo da posicao neutra (~10 s).");
    } else if (command == 'r' || command == 'R') {
      orientacaoMPU.reset();
      Serial.println("Calibracao removida: orientacao nos eixos originais do sensor.");
    }
  }
  unsigned long agora = millis();

  // Leituras e controle do motor funcionam
  // independentemente do Bluetooth.
  if (agora - ultimaLeitura >= INTERVALO_LEITURA) {
    atualizarSensores();

    // Notifica MacBook, se conectado
    enviarTelemetriaBLE();
  }

  // Reconecta automaticamente o anuncio
  // apos um cliente BLE desconectar.
  if (!bluetoothConectado &&
      bluetoothConectadoAnteriormente) {

    delay(50);
    BLEDevice::startAdvertising();

    bluetoothConectadoAnteriormente = false;

    Serial.println("Cliente BLE desconectado.");
    Serial.println("Aguardando nova conexao...");
  }

  if (bluetoothConectado &&
      !bluetoothConectadoAnteriormente) {

    bluetoothConectadoAnteriormente = true;

    Serial.println("MacBook conectado via BLE!");
  }

  delay(2);
}
