import type { z } from 'zod';
import type { telemetrySchema } from './validation';
export type Telemetry = z.infer<typeof telemetrySchema>;
export type Mode = 'demo' | 'real';
export type Scenario = 'automatic' | 'obstacle' | 'invalid' | 'sensor-offline' | 'offline' | 'fall';
export type Connection = 'loading' | 'online' | 'offline';
export type Sample = { receivedAt: number; telemetry: Telemetry };
export type EventKind = 'connection' | 'obstacle' | 'motor' | 'invalid' | 'sensor' | 'fall';
export type TelemetryEvent = { id: string; timestamp: number; kind: EventKind; source: string; description: string; level: 'info' | 'warning' | 'error' };
