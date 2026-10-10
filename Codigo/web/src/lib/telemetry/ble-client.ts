import { BLE_DEVICE_NAME, BLE_SERVICE_UUID, BLE_TELEMETRY_UUID, decodeBleTelemetry } from './ble-protocol';
import type { Telemetry } from './types';
// Minimal Web Bluetooth boundary, also implemented by test doubles. No browser globals at import time.
export interface BleCharacteristic extends EventTarget { value?: DataView; startNotifications(): Promise<BleCharacteristic> }
export interface BleServer { connected: boolean; connect(): Promise<BleServer>; disconnect(): void; getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<BleCharacteristic> }> }
export interface BleDevice extends EventTarget { name?: string; gatt?: BleServer }
export interface BleAdapter { requestDevice(options: { filters: { name: string }[]; optionalServices: string[] }): Promise<BleDevice> }
export type BleStatus = 'idle' | 'selecting' | 'connecting' | 'connected' | 'reconnecting' | 'unsupported';
type Callbacks = { onTelemetry: (data: Telemetry) => void; onStatus: (status: BleStatus) => void; onError: (message: string) => void };
export function bluetoothSupport(): { adapter?: BleAdapter; error?: string } {
  if (typeof window === 'undefined' || !window.isSecureContext) return { error: 'Bluetooth requer HTTPS ou localhost no próprio computador.' };
  const adapter = (navigator as Navigator & { bluetooth?: BleAdapter }).bluetooth;
  return adapter ? { adapter } : { error: 'Web Bluetooth indisponível. Abra esta página no Chrome para computador ou Android, com Bluetooth habilitado.' };
}
export class BleTelemetryClient {
  private device?: BleDevice;
  private characteristic?: BleCharacteristic;
  private retry?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private active = false;
  private busy = false;
  private pendingGatt = false;
  private attempts = 0;
  constructor(private adapter: BleAdapter, private callbacks: Callbacks) {}
  private changed = () => {
    const value = this.characteristic?.value;
    if (!this.active || !value) return;
    try { this.callbacks.onTelemetry(decodeBleTelemetry(value)); }
    catch (error) { this.callbacks.onError(error instanceof Error ? error.message : 'Pacote BLE inválido.'); }
  };
  private detachCharacteristic() { this.characteristic?.removeEventListener('characteristicvaluechanged', this.changed); this.characteristic = undefined; }
  private disconnected = () => {
    this.detachCharacteristic();
    if (!this.active || this.busy) return;
    this.callbacks.onError('Conexão BLE perdida. Aproxime o dispositivo; a reconexão é automática.');
    if (!this.busy) this.scheduleRetry();
  };
  private scheduleRetry() {
    if (!this.active || this.retry) return;
    this.callbacks.onStatus('reconnecting');
    this.retry = setTimeout(() => { this.retry = undefined; void this.connectGatt(); }, Math.min(1000 * 2 ** this.attempts++, 10000));
  }
  // Must be called by a click handler, before awaiting anything: browser permission is user-driven.
  async requestConnect() {
    if (this.busy || this.active) return;
    if (this.pendingGatt) { this.callbacks.onError('A conexão BLE anterior está encerrando. Tente novamente em instantes.'); return; }
    this.active = true; this.busy = true; const generation = ++this.generation;
    this.callbacks.onStatus('selecting');
    try {
      const device = await this.adapter.requestDevice({ filters: [{ name: BLE_DEVICE_NAME }], optionalServices: [BLE_SERVICE_UUID] });
      if (!this.active || generation !== this.generation) { device.gatt?.disconnect(); return; }
      this.device = device; device.addEventListener('gattserverdisconnected', this.disconnected);
      this.busy = false; await this.connectGatt();
    } catch (error) {
      if (generation !== this.generation) return;
      this.active = false; this.callbacks.onStatus('idle');
      const cancelled = error instanceof Error && error.name === 'NotFoundError';
      this.callbacks.onError(cancelled ? 'Nenhum dispositivo selecionado. Clique em Conectar BLE para tentar novamente.' : 'Não foi possível abrir o Bluetooth. Confira as permissões do navegador e do sistema.');
    } finally { if (generation === this.generation) this.busy = false; }
  }
  private async connectGatt() {
    if (!this.active || this.busy) return;
    if (this.pendingGatt) { this.scheduleRetry(); return; }
    const device = this.device;
    if (!device?.gatt) { this.disconnect(); this.callbacks.onError('Este dispositivo não oferece um servidor GATT.'); return; }
    this.busy = true; const generation = this.generation; let expired = false;
    const current = () => this.active && this.generation === generation && !expired;
    this.callbacks.onStatus(this.attempts ? 'reconnecting' : 'connecting');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        (async () => {
          this.pendingGatt = true;
          try {
          const server = await device.gatt!.connect();
          if (!current()) { server.disconnect(); return; }
          const service = await server.getPrimaryService(BLE_SERVICE_UUID);
          if (!current()) return;
          const characteristic = await service.getCharacteristic(BLE_TELEMETRY_UUID);
          if (!current()) return;
          this.detachCharacteristic(); this.characteristic = characteristic;
          characteristic.addEventListener('characteristicvaluechanged', this.changed);
          await characteristic.startNotifications();
          if (!current()) return;
          if (!server.connected) throw new Error('Dispositivo desconectado durante a assinatura.');
          this.attempts = 0; this.callbacks.onStatus('connected');
          } finally { this.pendingGatt = false; }
        })(),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => { expired = true; reject(new Error('Tempo de conexão BLE excedido.')); }, 10000); }),
      ]);
    } catch (error) {
      if (generation === this.generation && this.active) {
        this.detachCharacteristic(); device.gatt.disconnect();
        this.callbacks.onError(error instanceof Error ? error.message : 'Não foi possível receber telemetria BLE.');
        this.scheduleRetry();
      }
    } finally { clearTimeout(timeout); if (generation === this.generation) this.busy = false; }
  }
  disconnect() {
    this.active = false; this.busy = false; ++this.generation;
    clearTimeout(this.retry); this.retry = undefined; this.attempts = 0;
    this.detachCharacteristic();
    this.device?.removeEventListener('gattserverdisconnected', this.disconnected);
    this.device?.gatt?.disconnect(); this.device = undefined;
    this.callbacks.onStatus('idle');
  }
}
