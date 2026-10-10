'use client';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ChartNoAxesCombined, MoveHorizontal } from 'lucide-react';
import { useMemo } from 'react';
import type { Sample, Telemetry } from '@/lib/telemetry/types';
import { number, time } from '@/lib/utils';
export const axisColors = ['#3478ef', '#18a57b', '#a079df'];
function chartRows(history: Sample[], windowMinutes: number) {
  const cutoff = (history.at(-1)?.receivedAt ?? Date.now()) - windowMinutes * 60_000;
  return history.filter(s => s.receivedAt >= cutoff).flatMap((sample, i, all) => {
    const sensor = sample.telemetry.sensors.vl53l0x;
    const imu = sample.telemetry.sensors.mpu6500;
    const row = { time: sample.receivedAt, gap: false, distance: sensor?.valid && sensor.distance_mm !== null ? sensor.distance_mm / 10 : null, ax: imu?.acceleration.x ?? null, ay: imu?.acceleration.y ?? null, az: imu?.acceleration.z ?? null, gx: imu?.gyroscope.x ?? null, gy: imu?.gyroscope.y ?? null, gz: imu?.gyroscope.z ?? null };
    return i > 0 && sample.receivedAt - all[i - 1].receivedAt > 3000 ? [{ ...row, time: sample.receivedAt - 1, distance: null, gap: true, ax: null, ay: null, az: null, gx: null, gy: null, gz: null }, row] : [row];
  });
}
const tick = { fontSize: 10, fill: '#94a0b1', fontFamily: 'inherit' };
const tooltipStyle = { borderRadius: 9, border: '1px solid #e5eaf1', fontSize: 12, boxShadow: '0 5px 20px #18243b12' };
export function DistanceChart({ history, threshold, windowMinutes, setWindowMinutes }: { history: Sample[]; threshold: number; windowMinutes: number; setWindowMinutes: (n: number) => void }) {
  // Invalid readings are dropped so the line stays continuous; real connection gaps remain as breaks.
  const rows = useMemo(() => chartRows(history, windowMinutes).filter(row => row.gap || row.distance !== null), [history, windowMinutes]);
  return <section className="panel distance-chart"><div className="panel-heading"><h2><ChartNoAxesCombined size={17}/>Distância ao longo do tempo</h2><div className="segmented compact" aria-label="Janela do gráfico">{[1, 5].map(n => <button key={n} className={windowMinutes === n ? 'selected' : ''} onClick={() => setWindowMinutes(n)}>{n} min</button>)}</div></div><div className="chart-meta"><span>Distância <span className="unit">(cm)</span></span><span className="legend"><i className="line-key"/>VL53L0X <i className="dash-key"/>Limite</span></div><div className="chart-area" role="img" aria-label="Gráfico temporal de distância em centímetros e limite de alerta.">{rows.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={rows} margin={{ top: 12, right: 12, left: -26, bottom: 0 }}><defs><linearGradient id="distance-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4488ff" stopOpacity={.2}/><stop offset="100%" stopColor="#4488ff" stopOpacity={.01}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#edf0f5"/><XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} tickFormatter={v => time(v).slice(0, 5)} tick={tick} axisLine={false} tickLine={false} minTickGap={35}/><YAxis tick={tick} axisLine={false} tickLine={false} domain={[0, (max: number) => Math.max(180, Math.ceil(max / 50) * 50)]}/><Tooltip contentStyle={tooltipStyle} labelFormatter={v => time(Number(v))} formatter={v => [`${number(Number(v))} cm`, 'Distância']}/><ReferenceLine y={threshold / 10} stroke="#eead54" strokeDasharray="5 5"/><Area type="monotone" dataKey="distance" stroke="#4384ee" fill="url(#distance-fill)" strokeWidth={2.3} isAnimationActive={false} connectNulls={false}/></AreaChart></ResponsiveContainer> : <div className="chart-empty">As medições aparecerão aqui após a conexão.</div>}</div></section>;
}
export function MotionChart({ kind, history, current, windowMinutes }: { kind: 'acceleration' | 'gyroscope'; history: Sample[]; current: Telemetry | null; windowMinutes: number }) {
  const rows = useMemo(() => chartRows(history, windowMinutes), [history, windowMinutes]);
  const accel = kind === 'acceleration';
  const values = current?.sensors.mpu6500?.[kind];
  const unit = accel ? 'm/s²' : '°/s';
  return <section className="panel motion-chart"><div className="panel-heading"><h2>{accel ? <Activity size={17}/> : <MoveHorizontal size={17}/>} {accel ? 'Acelerômetro' : 'Giroscópio'}</h2><span className="sensor-label">MPU6500</span></div><div className="axis-values">{(['x', 'y', 'z'] as const).map((axis, i) => <div key={axis}><span className="axis-label" style={{ color: axisColors[i] }}><i style={{ background: axisColors[i] }}/>{axis.toUpperCase()}</span><strong>{number(values?.[axis], 2)}</strong><small>{unit}</small></div>)}</div><div className="motion-chart-area" role="img" aria-label={`${accel ? 'Aceleração' : 'Velocidade angular'} nos eixos X, Y e Z, em ${unit}.`}>{rows.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 8, left: -27, right: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#edf0f5"/><XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} tickFormatter={v => time(v).slice(0, 5)} tick={tick} axisLine={false} tickLine={false} minTickGap={35}/><YAxis tick={tick} axisLine={false} tickLine={false} domain={accel ? [-2, 12] : [-3, 3]}/><Tooltip contentStyle={tooltipStyle} labelFormatter={v => time(Number(v))} formatter={(v, name) => [`${number(Number(v), 2)} ${unit}`, String(name).slice(1).toUpperCase()]}/>{['x','y','z'].map((axis,i) => <Line key={axis} type="monotone" dataKey={`${accel ? 'a' : 'g'}${axis}`} stroke={axisColors[i]} strokeWidth={1.8} dot={false} isAnimationActive={false} connectNulls={false}/>)}</LineChart></ResponsiveContainer> : <div className="chart-empty">Aguardando amostras do sensor</div>}</div></section>;
}
