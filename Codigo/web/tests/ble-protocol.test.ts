import { describe, it, expect } from 'vitest';
import { decodeBleTelemetry, BLE_DEVICE_NAME, BLE_SERVICE_UUID, BLE_TELEMETRY_UUID } from '../src/lib/telemetry/ble-protocol';
function packet(distance = 350, status = 0x80, pwm = 160) {
 const data = new DataView(new ArrayBuffer(20));
 data.setUint16(0, distance, true);
 [12, 50, 978, 18, -12, 4, -1250, 380].forEach((value, i) => data.setInt16(2 + i * 2, value, true));
 data.setUint8(18, status); data.setUint8(19, pwm); return data;
}
describe('existing GuiaCampus binary protocol', () => {
 it('matches the exact device name and supplied UUIDs', () => { expect(BLE_DEVICE_NAME).toBe('GuiaCampus-01'); expect(BLE_SERVICE_UUID).toBe('7950b3d2-2bf1-4c21-9b2b-535f878a2101'); expect(BLE_TELEMETRY_UUID).toBe('7950b3d2-2bf1-4c21-9b2b-535f878a2102'); });
 it('decodes the 20-byte payload with signed little-endian scaling', () => {
  const d = decodeBleTelemetry(packet());
  expect(d.sensors.vl53l0x).toEqual({ distance_mm:350, range_status:0, valid:true });
  expect(d.sensors.mpu6500).toEqual({ acceleration:{x:.12,y:.5,z:9.78}, gyroscope:{x:.18,y:-.12,z:.04}, orientation:{pitch:-12.5,roll:3.8} });
  expect(d.actuator).toMatchObject({ motor_active:true, pwm:160, configured_pwm:160, pwm_semantics:'applied' });
 });
 it.each([0, 65535])('treats sentinel distance %s as unknown, never reliable zero', value => { const d = decodeBleTelemetry(packet(value)); expect(d.sensors.vl53l0x!.valid).toBe(false); expect(d.sensors.vl53l0x!.distance_mm).toBeNull(); });
 it('honors nonzero RangeStatus even if distance looks plausible', () => { const d = decodeBleTelemetry(packet(350, 0x84)); expect(d.sensors.vl53l0x).toEqual({distance_mm:null,range_status:4,valid:false}); expect(d.sensors.mpu6500).not.toBeNull(); });
 it('ignores stale IMU fields when bit 7 is clear', () => { expect(decodeBleTelemetry(packet(350, 0)).sensors.mpu6500).toBeNull(); });
 it('decodes the firmware initial packet without inventing uptime or identity', () => { const d = decodeBleTelemetry(packet(65535,127,0)); expect(d.timestamp_ms).toBeNull(); expect(d.sensors.mpu6500).toBeNull(); expect(d.sensors.vl53l0x!.range_status).toBe(127); expect(d.actuator.motor_active).toBe(false); expect(d.settings.source).toBe('firmware-config'); });
 it.each([0,19,21,40])('rejects invalid packet length %s', length => expect(() => decodeBleTelemetry(new DataView(new ArrayBuffer(length)))).toThrow('20 bytes'));
 it('uses DataView offsets rather than interpreting its entire backing buffer', () => { const raw = new Uint8Array(30); raw.set(new Uint8Array(packet().buffer),5); expect(decodeBleTelemetry(new DataView(raw.buffer,5,20)).sensors.vl53l0x!.distance_mm).toBe(350); });
 it('preserves extreme signed gyro values and rejects impossible orientation', () => { const p = packet(); p.setInt16(8,-32768,true); p.setInt16(10,32767,true); expect(decodeBleTelemetry(p).sensors.mpu6500!.gyroscope).toMatchObject({x:-327.68,y:327.67}); p.setInt16(14,32767,true); expect(() => decodeBleTelemetry(p)).toThrow(); });
 it('allows identical successive packets, since stationary readings are legitimate', () => { const p = packet(); expect(decodeBleTelemetry(p)).toEqual(decodeBleTelemetry(p)); });
});
