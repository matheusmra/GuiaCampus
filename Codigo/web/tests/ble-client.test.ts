import { afterEach, describe, expect, it, vi } from 'vitest';
import { BleTelemetryClient, type BleServer, type BleDevice, type BleCharacteristic } from '../src/lib/telemetry/ble-client';
import { BLE_DEVICE_NAME, BLE_SERVICE_UUID, BLE_TELEMETRY_UUID } from '../src/lib/telemetry/ble-protocol';
class Characteristic extends EventTarget implements BleCharacteristic { value?: DataView; startNotifications = vi.fn(async () => this); }
function fixture() {
  const characteristic = new Characteristic();
  const getCharacteristic = vi.fn(async () => characteristic);
  const device = new EventTarget() as BleDevice;
  const server: BleServer = { connected: false, connect: vi.fn(async () => { server.connected = true; return server; }), disconnect: vi.fn(() => { server.connected = false; device.dispatchEvent(new Event('gattserverdisconnected')); }), getPrimaryService: vi.fn(async () => ({ getCharacteristic })) };
  device.name = BLE_DEVICE_NAME; device.gatt = server;
  const adapter = { requestDevice: vi.fn(async () => device) };
  const callbacks = { onTelemetry: vi.fn(), onError: vi.fn(), onStatus: vi.fn() };
  const client = new BleTelemetryClient(adapter, callbacks);
  return { client, callbacks, adapter, server, device, characteristic, getCharacteristic };
}
afterEach(() => vi.useRealTimers());
describe('BLE lifecycle', () => {
 it('requests the exact name from a user action then subscribes to the custom service', async () => { const f = fixture(); await f.client.requestConnect(); expect(f.adapter.requestDevice).toHaveBeenCalledWith({ filters: [{name: BLE_DEVICE_NAME}], optionalServices: [BLE_SERVICE_UUID] }); expect(f.server.getPrimaryService).toHaveBeenCalledWith(BLE_SERVICE_UUID); expect(f.getCharacteristic).toHaveBeenCalledWith(BLE_TELEMETRY_UUID); expect(f.callbacks.onStatus).toHaveBeenLastCalledWith('connected'); f.client.disconnect(); });
 it('does not open duplicate choosers or duplicate connections', async () => { const f = fixture(); await Promise.all([f.client.requestConnect(), f.client.requestConnect()]); expect(f.adapter.requestDevice).toHaveBeenCalledTimes(1); expect(f.server.connect).toHaveBeenCalledTimes(1); f.client.disconnect(); });
 it('re-discovers GATT after a drop without reopening the chooser', async () => { vi.useFakeTimers(); const f = fixture(); await f.client.requestConnect(); f.server.disconnect(); expect(f.callbacks.onStatus).toHaveBeenLastCalledWith('reconnecting'); await vi.advanceTimersByTimeAsync(1000); expect(f.server.getPrimaryService).toHaveBeenCalledTimes(2); expect(f.characteristic.startNotifications).toHaveBeenCalledTimes(2); expect(f.adapter.requestDevice).toHaveBeenCalledTimes(1); f.client.disconnect(); });
 it('cancels retries after intentional disconnect', async () => { vi.useFakeTimers(); const f = fixture(); await f.client.requestConnect(); f.server.disconnect(); f.client.disconnect(); await vi.advanceTimersByTimeAsync(20000); expect(f.server.connect).toHaveBeenCalledTimes(1); expect(f.callbacks.onStatus).toHaveBeenLastCalledWith('idle'); });
 it('handles cancelled permissions without automatic device prompts', async () => { const f = fixture(); f.adapter.requestDevice.mockRejectedValueOnce(new DOMException('cancel', 'NotFoundError')); await f.client.requestConnect(); expect(f.callbacks.onStatus).toHaveBeenLastCalledWith('idle'); expect(f.callbacks.onError.mock.calls[0][0]).toContain('Nenhum dispositivo'); expect(f.server.connect).not.toHaveBeenCalled(); });
 it('releases a device returned after unmount/cancellation', async () => { const f = fixture(); let resolve!: (device: BleDevice) => void; f.adapter.requestDevice.mockReturnValueOnce(new Promise(r => { resolve = r; })); const pending = f.client.requestConnect(); f.client.disconnect(); resolve(f.device); await pending; expect(f.server.connect).not.toHaveBeenCalled(); expect(f.server.disconnect).toHaveBeenCalled(); });
 it('bounds the connection timeout and reports failure', async () => { vi.useFakeTimers(); const f = fixture(); vi.mocked(f.server.connect).mockImplementationOnce(() => new Promise(() => {})); const pending = f.client.requestConnect(); await vi.advanceTimersByTimeAsync(10001); await pending; expect(f.callbacks.onError.mock.calls[0][0]).toContain('excedido'); f.client.disconnect(); });
});
describe('notifications and shutdown', () => {
 it('delivers decoded packets and rejects malformed notifications', async () => {
   const f = fixture(); await f.client.requestConnect();
   const p = new DataView(new ArrayBuffer(20)); p.setUint16(0,350,true); p.setUint8(18,128); p.setUint8(19,160);
   f.characteristic.value = p; f.characteristic.dispatchEvent(new Event('characteristicvaluechanged'));
   expect(f.callbacks.onTelemetry).toHaveBeenCalledWith(expect.objectContaining({ device_id:BLE_DEVICE_NAME, timestamp_ms:null }));
   f.characteristic.value = new DataView(new ArrayBuffer(19)); f.characteristic.dispatchEvent(new Event('characteristicvaluechanged'));
   expect(f.callbacks.onError).toHaveBeenLastCalledWith(expect.stringContaining('20 bytes'));
   expect(f.callbacks.onTelemetry).toHaveBeenCalledTimes(1);
   f.client.disconnect(); f.characteristic.value = p; f.characteristic.dispatchEvent(new Event('characteristicvaluechanged'));
   expect(f.callbacks.onTelemetry).toHaveBeenCalledTimes(1);
 });
 it('does not overlap GATT operations after a timeout', async () => {
   vi.useFakeTimers(); const f = fixture();
   vi.mocked(f.server.connect).mockImplementationOnce(() => new Promise(() => {}));
   const pending = f.client.requestConnect(); await vi.advanceTimersByTimeAsync(10001); await pending;
   await vi.advanceTimersByTimeAsync(20000); expect(f.server.connect).toHaveBeenCalledTimes(1);
   f.client.disconnect();
 });
});
