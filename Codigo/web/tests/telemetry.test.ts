import { describe, it, expect } from 'vitest';
import { parseTelemetry } from '../src/lib/telemetry/validation';
import { mockTelemetry } from '../src/lib/telemetry/mock';
import { appendHistory, transitions } from '../src/lib/telemetry/events';
describe('telemetry contract', () => {
 it('accepts the real hardware contract and maintains units', () => { const d = mockTelemetry(1000); expect(parseTelemetry(d)).toEqual(d); });
 it('never trusts a nonzero RangeStatus, even if firmware says valid', () => { const d = mockTelemetry(1000); d.sensors.vl53l0x!.range_status = 4; d.sensors.vl53l0x!.valid = true; expect(parseTelemetry(d).sensors.vl53l0x!.valid).toBe(false); });
 it('does not coerce null measurements to zero', () => { const d = mockTelemetry(1000, 'invalid'); expect(parseTelemetry(d).sensors.vl53l0x!.distance_mm).toBeNull(); });
 it('marks a null distance invalid even with a zero range status', () => { const d = mockTelemetry(1000); d.sensors.vl53l0x!.distance_mm = null; expect(parseTelemetry(d).sensors.vl53l0x!.valid).toBe(false); });
 it('accepts unavailable sensors without inventing readings', () => { const d = mockTelemetry(1000); d.sensors = { vl53l0x: null, mpu6500: null }; expect(parseTelemetry(d).sensors.mpu6500).toBeNull(); });
 it.each([NaN, Infinity, -1, 70000])('rejects invalid distance %s', value => { const d = mockTelemetry(1000); d.sensors.vl53l0x!.distance_mm = value; expect(() => parseTelemetry(d)).toThrow(); });
 it('rejects missing actuator, malformed vectors, and out-of-range PWM', () => { const d = mockTelemetry(1000); expect(() => parseTelemetry({ ...d, actuator: undefined })).toThrow(); expect(() => parseTelemetry({ ...d, actuator: { motor_active: true, pwm: 256 } })).toThrow(); expect(() => parseTelemetry({ ...d, sensors: { mpu6500: { acceleration: { x: '1' } } } })).toThrow(); });
});
describe('transitions and bounded history', () => {
 it('records obstacle and motor onset once', () => { const far = mockTelemetry(1000); const close = mockTelemetry(1000, 'obstacle'); expect(transitions(far, close, 10).map(e => e.kind)).toEqual(['obstacle', 'motor']); expect(transitions(close, close, 20)).toEqual([]); });
 it('ignores invalid readings, records sensor loss once and recovery explicitly', () => { const valid = mockTelemetry(1000); const invalid = mockTelemetry(1000, 'invalid'); const missing = mockTelemetry(1000, 'sensor-offline'); expect(transitions(valid, invalid, 10).some(e => e.kind === 'invalid')).toBe(false); expect(transitions(invalid, invalid, 20)).toEqual([]); expect(transitions(invalid, missing, 30).some(e => e.kind === 'sensor')).toBe(true); expect(transitions(missing, missing, 40)).toEqual([]); expect(transitions(missing, valid, 50).some(e => e.kind === 'sensor' && e.level === 'info')).toBe(true); });
 it('retains at most 1601 samples and at most five minutes', () => { const values = Array.from({length: 1000}, (_, i) => ({ receivedAt: i * 500 })); const result = appendHistory(values, { receivedAt: 500000 }); expect(result.length).toBeLessThanOrEqual(1601); expect(result.every(s => s.receivedAt >= 200000)).toBe(true); });
});
describe('firmware boundary and BLE retention', () => {
 it('detects obstacles at exactly 500 mm, matching the supplied firmware', () => {
   const far = mockTelemetry(1000); const edge = mockTelemetry(1000); edge.sensors.vl53l0x!.distance_mm=500;
   expect(transitions(far,edge,1).some(e=>e.kind==='obstacle')).toBe(true);
 });
 it('retains five minutes at a 200 ms interval and caps unexpectedly faster senders', () => {
   const history=Array.from({length:1500},(_,i)=>({receivedAt:i*200}));
   expect(appendHistory(history,{receivedAt:300000})).toHaveLength(1501);
   expect(appendHistory(Array.from({length:5000},(_,i)=>({receivedAt:i})),{receivedAt:5000})).toHaveLength(1601);
 });
});
