import type { Scenario, Telemetry, Sample } from './types';
export function mockTelemetry(elapsed: number, scenario: Scenario = 'automatic'): Telemetry {
  const t = elapsed / 1000;
  const invalid = scenario === 'invalid' || (scenario === 'automatic' && t % 65 > 61);
  const distance = Math.round(scenario === 'obstacle' ? 320 + Math.sin(t) * 35 : 900 + Math.sin(t / 7) * 510 + Math.cos(t / 2.1) * 85);
  // Fall scenario: every 25 s a violent spike (>=1 s) followed by a lasting tilted, settled pose.
  const phase = t % 25;
  const impact = scenario === 'fall' && phase >= 10 && phase < 11.1;
  const fallen = scenario === 'fall' && phase >= 11.1 && phase < 20;
  const motion = impact ? { acceleration: { x: 4, y: 6, z: 19.4 }, gyroscope: { x: 210, y: 120, z: 60 }, orientation: { pitch: 30, roll: 20 } } : fallen ? { acceleration: { x: 0.3, y: 9.7, z: 1.1 }, gyroscope: { x: 1, y: 1, z: 0.5 }, orientation: { pitch: 5, roll: 82 } } : null;
  return {
    device_id: 'GuiaCampus-01', timestamp_ms: Math.round(elapsed),
    sensors: {
      vl53l0x: scenario === 'sensor-offline' ? null : { distance_mm: invalid ? null : distance, range_status: invalid ? 4 : 0, valid: !invalid },
      mpu6500: motion ? { ...motion, who_am_i: 0x70 } : { acceleration: { x: Math.sin(t / 3) * .45, y: Math.cos(t / 4) * .62, z: 9.81 + Math.sin(t * 2) * .13 }, gyroscope: { x: Math.sin(t / 2) * 1.8, y: Math.cos(t / 3) * 1.2, z: Math.sin(t / 4) * .6 }, orientation: { pitch: Math.sin(t / 7) * 12, roll: Math.cos(t / 9) * 8 }, who_am_i: 0x70 },
    },
    actuator: { motor_active: !invalid && scenario !== 'sensor-offline' && distance <= 500, pwm: !invalid && scenario !== 'sensor-offline' && distance <= 500 ? 160 : 0, configured_pwm: 160, pwm_semantics: 'applied' },
    settings: { distance_threshold_mm: 500 },
  };
}
export function demoHistory(now: number): Sample[] {
  return Array.from({ length: 80 }, (_, i) => ({ receivedAt: now - (79 - i) * 750, telemetry: mockTelemetry(90000 + i * 750) }));
}
