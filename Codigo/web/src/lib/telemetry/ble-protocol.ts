import { parseTelemetry } from './validation';
export const BLE_DEVICE_NAME = 'GuiaCampus-01';
export const BLE_SERVICE_UUID = '7950b3d2-2bf1-4c21-9b2b-535f878a2101';
export const BLE_TELEMETRY_UUID = '7950b3d2-2bf1-4c21-9b2b-535f878a2102';
export const BLE_PACKET_BYTES = 20;
// These constants come from the supplied sketch; they are NOT transmitted over BLE.
export const FIRMWARE_DISTANCE_THRESHOLD_MM = 500;
export const FIRMWARE_CONFIGURED_PWM = 160;
export const FIRMWARE_INTERVAL_MS = 200;
/** Decode the user's existing 20-byte, little-endian firmware packet. */
export function decodeBleTelemetry(packet: DataView) {
  if (packet.byteLength !== BLE_PACKET_BYTES) throw new Error(`Pacote BLE inválido: esperado 20 bytes, recebido ${packet.byteLength}.`);
  const rawDistance = packet.getUint16(0, true);
  const status = packet.getUint8(18);
  const rangeStatus = status & 0x7f;
  const imuValid = (status & 0x80) !== 0;
  const pwm = packet.getUint8(19);
  const scaled = (offset: number) => packet.getInt16(offset, true) / 100;
  const distanceValid = rangeStatus === 0 && rawDistance > 0 && rawDistance < 65535;
  return parseTelemetry({
    device_id: BLE_DEVICE_NAME,
    timestamp_ms: null, // This packet does not carry an uptime or sample sequence.
    sensors: {
      vl53l0x: { distance_mm: distanceValid ? rawDistance : null, range_status: rangeStatus, valid: distanceValid },
      mpu6500: imuValid ? { acceleration: { x: scaled(2), y: scaled(4), z: scaled(6) }, gyroscope: { x: scaled(8), y: scaled(10), z: scaled(12) }, orientation: { pitch: scaled(14), roll: scaled(16) } } : null,
    },
    actuator: { motor_active: pwm > 0, pwm, configured_pwm: FIRMWARE_CONFIGURED_PWM, pwm_semantics: 'applied' },
    settings: { distance_threshold_mm: FIRMWARE_DISTANCE_THRESHOLD_MM, source: 'firmware-config' },
  });
}
