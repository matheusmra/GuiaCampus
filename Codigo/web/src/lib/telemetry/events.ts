import type { Telemetry, TelemetryEvent } from './types';
export function transitions(previous: Telemetry | null, current: Telemetry, now: number): TelemetryEvent[] {
  const events: TelemetryEvent[] = [];
  const add = (kind: TelemetryEvent['kind'], source: string, description: string, level: TelemetryEvent['level'] = 'info') => events.push({ id: `${now}-${kind}-${source}`, timestamp: now, kind, source, description, level });
  for (const sensor of ['vl53l0x', 'mpu6500'] as const) {
    if (!current.sensors[sensor] && (!previous || previous.sensors[sensor])) add('sensor', sensor.toUpperCase(), 'Sensor sem comunicação ou sem dados.', 'error');
    if (current.sensors[sensor] && previous && !previous.sensors[sensor]) add('sensor', sensor.toUpperCase(), 'Dados válidos do sensor restabelecidos.');
  }
  const distance = current.sensors.vl53l0x;
  const oldDistance = previous?.sensors.vl53l0x;
  const close = distance?.valid && distance.distance_mm !== null && distance.distance_mm <= current.settings.distance_threshold_mm;
  const wasClose = previous && oldDistance?.valid && oldDistance.distance_mm !== null && oldDistance.distance_mm <= previous.settings.distance_threshold_mm;
  if (close && !wasClose) add('obstacle', 'VL53L0X', `Obstáculo detectado a ${(distance!.distance_mm! / 10).toFixed(1)} cm.`, 'warning');
  if (previous?.actuator.motor_active !== current.actuator.motor_active) add('motor', 'Coin motor', current.actuator.motor_active ? 'Motor acionado pelo controle local.' : 'Motor desligado pelo controle local.', current.actuator.motor_active ? 'warning' : 'info');
  return events;
}
export function appendHistory<T extends { receivedAt: number }>(history: T[], sample: T): T[] {
  return [...history.filter(item => item.receivedAt >= sample.receivedAt - 300_000), sample].slice(-1601);
}
