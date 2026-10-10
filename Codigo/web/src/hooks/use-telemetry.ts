'use client';
import { useEffect, useRef, useState } from 'react';
import { BleTelemetryClient, bluetoothSupport, type BleStatus } from '@/lib/telemetry/ble-client';
import { demoHistory, mockTelemetry } from '@/lib/telemetry/mock';
import { appendHistory, transitions } from '@/lib/telemetry/events';
import { FallDetector, type FallAlert } from '@/lib/telemetry/fall';
import type { Connection, Mode, Sample, Scenario, Telemetry, TelemetryEvent } from '@/lib/telemetry/types';
export function useTelemetry(mode: Mode, interval: number, paused: boolean, scenario: Scenario) {
  const [data, setData] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<Sample[]>([]);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [connection, setConnection] = useState<Connection>(mode === 'real' ? 'offline' : 'loading');
  const [bleStatus, setBleStatus] = useState<BleStatus>('idle');
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(0);
  const [fallAlert, setFallAlert] = useState<FallAlert | null>(null);
  const fallDetector = useRef(new FallDetector());
  const client = useRef<BleTelemetryClient | null>(null);
  const previous = useRef<Telemetry | null>(null);
  const connected = useRef<Connection>('loading');
  const startedAt = useRef(0);
  const lastDeviceChange = useRef(0);
  const lastReceived = useRef(0);
  const timestamp = useRef<number | null>(null);
  const flags = useRef({ paused, mode });
  useEffect(() => { flags.current = { paused, mode }; if (!paused && mode === 'real') { setData(null); } }, [paused, mode]);
  const handlers = useRef({ accept: (_: Telemetry) => {}, fail: (_: string) => {} });
  useEffect(() => {
    const push = (items: TelemetryEvent[]) => setEvents(old => [...items.reverse(), ...old].slice(0, 120));
    const fail = (message: string) => {
      const now = Date.now();
      if (connected.current !== 'offline') push([{ id: `${now}-offline`, timestamp: now, kind: 'connection', source: mode === 'demo' ? 'Simulador' : 'BLE', description: 'Telemetria indisponível. Consulte o estado da conexão.', level: 'error' }]);
      connected.current = 'offline'; setConnection('offline'); setError(message);
      setHistory(old => old.filter(item => item.receivedAt >= now - 300_000));
    };
    handlers.current = { fail, accept: current => {
      if (flags.current.paused) return;
      const now = Date.now();
      if (current.timestamp_ms === null) { /* Firmware BLE has no timestamp; liveness uses notification arrival. */ }
      else if (timestamp.current !== current.timestamp_ms) { lastDeviceChange.current = now; timestamp.current = current.timestamp_ms; }
      else if (now - lastDeviceChange.current > 3000) { fail('Telemetria estagnada: o timestamp do dispositivo não avança.'); return; }
      lastReceived.current = now;
      const changes = transitions(previous.current, current, now);
      const fall = fallDetector.current.push(current, now);
      if (fall) { changes.push({ id: `${now}-fall`, timestamp: now, kind: 'fall', source: 'MPU6500', description: `Possível queda detectada · pico ${fall.peakAcceleration.toFixed(1)} m/s², giro ${fall.peakGyro.toFixed(0)} °/s, inclinação ${fall.tilt.toFixed(0)}°.`, level: 'error' }); setFallAlert(fall); }
      if (connected.current !== 'online') changes.push({ id: `${now}-connection`, timestamp: now, kind: 'connection', source: mode === 'demo' ? 'Simulador' : 'BLE', description: connected.current === 'offline' ? 'Telemetria restabelecida.' : mode === 'demo' ? 'Sessão de demonstração iniciada.' : 'Telemetria BLE recebida.', level: 'info' });
      push(changes); previous.current = current; connected.current = 'online';
      setData(current); setConnection('online'); setLastUpdate(now); setError(null);
      setHistory(old => appendHistory(old, { receivedAt: now, telemetry: current }));
    } };
  }, [mode]);
  useEffect(() => {
    startedAt.current = Date.now();
    if (mode === 'demo') { setHistory(demoHistory(startedAt.current)); return; }
    const support = bluetoothSupport();
    if (!support.adapter) { setBleStatus('unsupported'); setError(support.error!); return; }
    let alive = true;
    const ble = new BleTelemetryClient(support.adapter, {
      onTelemetry: value => { if (alive) handlers.current.accept(value); },
      onError: message => { if (alive) handlers.current.fail(message); },
      onStatus: status => {
        if (!alive) return;
        setBleStatus(status);
        if (status === 'connected') { lastReceived.current = Date.now(); setError(null); setConnection('loading'); }
        else if (status === 'idle') { setConnection('offline'); connected.current = 'offline'; }
      },
    });
    client.current = ble;
    return () => { alive = false; ble.disconnect(); client.current = null; };
  }, [mode]);
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now(); setClock(now);
      if (mode === 'real' && bleStatus === 'connected' && !flags.current.paused && now - lastReceived.current > 4000) handlers.current.fail('Sem telemetria BLE válida há mais de 4 segundos. Verifique o firmware e a assinatura de notificações.');
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, bleStatus]);
  useEffect(() => {
    if (mode !== 'demo' || paused) return;
    const tick = () => scenario === 'offline' ? handlers.current.fail('Perda de conexão simulada. Selecione outro cenário para reconectar.') : handlers.current.accept(mockTelemetry(150000 + Date.now() - startedAt.current, scenario));
    tick(); const timer = setInterval(tick, interval); return () => clearInterval(timer);
  }, [mode, interval, paused, scenario]);
  return { data, history, events, connection, lastUpdate, error, bleStatus,
    connectBle: () => { setError(null); void client.current?.requestConnect(); },
    disconnectBle: () => { client.current?.disconnect(); setData(null); setError(null); },
    age: lastUpdate ? Math.max(0, Math.floor(((clock || Date.now()) - lastUpdate) / 1000)) : null, clearEvents: () => setEvents([]), fallAlert, dismissFall: () => setFallAlert(null) };
}
