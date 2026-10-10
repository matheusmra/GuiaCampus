import type { Telemetry } from './types';

/**
 * Heuristic fall detector based on the MPU6500 data carried by the BLE packet.
 *
 * Limits of the data: the packet arrives about every 200 ms and the IMU runs at
 * +-2 g / +-250 deg/s, so impacts saturate near 19.6 m/s2 and short free-fall phases can be
 * missed. The detector therefore combines a trigger (violent motion) with a confirmation
 * (a lasting change of orientation once the device has settled). It signals a POSSIBLE fall
 * and is not a certified safety function.
 */
export const FALL_IMPACT_MS2 = 16;
export const FALL_FREEFALL_MS2 = 3;
export const FALL_GYRO_DPS = 180;
export const FALL_TILT_DEG = 45;
export const FALL_CONFIRM_WINDOW_MS = 4000;
export const FALL_COOLDOWN_MS = 10_000;
const SETTLED_ACCEL_MIN = 7;
const SETTLED_ACCEL_MAX = 13;
const SETTLED_GYRO_DPS = 60;

export type FallAlert = { timestamp: number; peakAcceleration: number; peakGyro: number; tilt: number };
type Orientation = { pitch: number; roll: number };
type Pending = { at: number; baseline: Orientation; peakAcceleration: number; peakGyro: number };

const norm = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);
const angleDelta = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

export class FallDetector {
  private baseline: Orientation | null = null;
  private pending: Pending | null = null;
  private lastAlert = -Infinity;

  reset() { this.baseline = null; this.pending = null; this.lastAlert = -Infinity; }

  /** Feed one telemetry sample; returns an alert when a possible fall is confirmed. */
  push(telemetry: Telemetry, now: number): FallAlert | null {
    const imu = telemetry.sensors.mpu6500;
    if (!imu) { this.pending = null; return null; }
    const accel = norm(imu.acceleration);
    const gyro = norm(imu.gyroscope);
    const orientation = imu.orientation;
    const violent = accel >= FALL_IMPACT_MS2 || accel <= FALL_FREEFALL_MS2 || gyro >= FALL_GYRO_DPS;
    if (now - this.lastAlert < FALL_COOLDOWN_MS) { if (!violent) this.baseline = orientation; return null; }
    if (!this.pending) {
      if (violent && this.baseline) this.pending = { at: now, baseline: this.baseline, peakAcceleration: accel, peakGyro: gyro };
      else if (!violent) this.baseline = orientation;
      return null;
    }
    const pending = this.pending;
    if (now - pending.at > FALL_CONFIRM_WINDOW_MS) { this.pending = null; this.baseline = orientation; return null; }
    pending.peakAcceleration = Math.max(pending.peakAcceleration, accel);
    pending.peakGyro = Math.max(pending.peakGyro, gyro);
    const tilt = Math.max(angleDelta(orientation.pitch, pending.baseline.pitch), angleDelta(orientation.roll, pending.baseline.roll));
    const settled = accel >= SETTLED_ACCEL_MIN && accel <= SETTLED_ACCEL_MAX && gyro < SETTLED_GYRO_DPS;
    if (settled && tilt >= FALL_TILT_DEG) {
      this.pending = null; this.lastAlert = now; this.baseline = orientation;
      return { timestamp: now, peakAcceleration: pending.peakAcceleration, peakGyro: pending.peakGyro, tilt };
    }
    return null;
  }
}
