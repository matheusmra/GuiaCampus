import { describe, expect, it } from 'vitest';
import { FallDetector } from '../src/lib/telemetry/fall';
import { mockTelemetry } from '../src/lib/telemetry/mock';
import type { Telemetry } from '../src/lib/telemetry/types';

const sample = (acceleration: [number, number, number], gyroscope: [number, number, number], pitch: number, roll: number): Telemetry => {
  const base = mockTelemetry(1000);
  return { ...base, sensors: { ...base.sensors, mpu6500: { acceleration: { x: acceleration[0], y: acceleration[1], z: acceleration[2] }, gyroscope: { x: gyroscope[0], y: gyroscope[1], z: gyroscope[2] }, orientation: { pitch, roll } } } };
};
const still = (pitch = 2, roll = 3) => sample([0.2, 0.3, 9.8], [0.5, 0.5, 0.2], pitch, roll);
const impact = () => sample([4, 6, 19.4], [210, 120, 60], 30, 20);

describe('fall detection', () => {
  it('alerts on impact followed by a settled, tilted pose', () => {
    const detector = new FallDetector();
    expect(detector.push(still(), 0)).toBeNull();
    expect(detector.push(still(), 200)).toBeNull();
    expect(detector.push(impact(), 400)).toBeNull();
    const alert = detector.push(sample([0.3, 9.7, 1.1], [1, 1, 0.5], 5, 82), 1200);
    expect(alert).not.toBeNull();
    expect(alert!.tilt).toBeGreaterThanOrEqual(45);
    expect(alert!.peakAcceleration).toBeGreaterThan(19);
  });
  it('ignores a spike when the orientation does not change', () => {
    const detector = new FallDetector();
    detector.push(still(), 0);
    detector.push(impact(), 200);
    expect(detector.push(still(), 600)).toBeNull();
    expect(detector.push(still(), 5000)).toBeNull();
  });
  it('does not alert on a tilt without violent motion', () => {
    const detector = new FallDetector();
    detector.push(still(), 0);
    expect(detector.push(still(5, 82), 200)).toBeNull();
  });
  it('applies a cooldown after an alert and ignores missing IMU data', () => {
    const detector = new FallDetector();
    detector.push(still(), 0);
    detector.push(impact(), 200);
    expect(detector.push(sample([0.3, 9.7, 1.1], [1, 1, 0.5], 5, 82), 600)).not.toBeNull();
    detector.push(impact(), 1000);
    expect(detector.push(still(), 1400)).toBeNull();
    const base = mockTelemetry(1000, 'fall');
    expect(detector.push({ ...base, sensors: { ...base.sensors, mpu6500: null } }, 1800)).toBeNull();
  });
  it('detects the simulated fall scenario', () => {
    const detector = new FallDetector();
    const alerts = Array.from({ length: 40 }, (_, i) => detector.push(mockTelemetry(150000 + i * 750, 'fall'), i * 750)).filter(Boolean);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });
});
