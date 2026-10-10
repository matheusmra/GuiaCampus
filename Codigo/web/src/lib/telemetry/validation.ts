import { z } from 'zod';
const finite = z.number().finite();
const vector = z.object({ x: finite, y: finite, z: finite });
const distance = z.object({
  distance_mm: finite.min(0).max(65535).nullable(),
  range_status: z.number().int().min(0).max(255), valid: z.boolean(),
}).transform(value => ({ ...value, valid: value.valid && value.range_status === 0 && value.distance_mm !== null }));
const imu = z.object({ acceleration: vector, gyroscope: vector,
  orientation: z.object({ pitch: finite.min(-180).max(180), roll: finite.min(-180).max(180) }),
  who_am_i: z.number().int().min(0).max(255).optional(),
});
export const telemetrySchema = z.object({
  device_id: z.string().min(1).max(100), timestamp_ms: finite.int().nonnegative().nullable(),
  sensors: z.object({ vl53l0x: distance.nullable().optional().default(null), mpu6500: imu.nullable().optional().default(null) }),
  actuator: z.object({ motor_active: z.boolean(), pwm: z.number().int().min(0).max(255), configured_pwm: z.number().int().min(0).max(255).optional(), pwm_semantics: z.enum(['applied', 'configured']).optional() }),
  settings: z.object({ distance_threshold_mm: finite.positive().max(65535), source: z.enum(['telemetry', 'firmware-config']).optional() }),
});
export function parseTelemetry(input: unknown) {
  const result = telemetrySchema.safeParse(input);
  if (!result.success) throw new Error('Telemetria malformada: ' + result.error.issues.map(issue => issue.path.join('.')).join(', '));
  return result.data;
}
