'use client';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, ChartNoAxesCombined, MoveHorizontal } from 'lucide-react';
import { useMemo } from 'react';
import type { Sample, Telemetry } from '@/lib/telemetry/types';
import { number, time } from '@/lib/utils';

export const axisColors = ['#0A4FE0', '#5FB34A', '#0B1E6B'];

function chartRows(history: Sample[], windowMinutes: number) {
  const cutoff = (history.at(-1)?.receivedAt ?? Date.now()) - windowMinutes * 60_000;
  return history
    .filter(s => s.receivedAt >= cutoff)
    .flatMap((sample, i, all) => {
      const sensor = sample.telemetry.sensors.vl53l0x;
      const imu = sample.telemetry.sensors.mpu6500;
      const row = {
        time: sample.receivedAt,
        gap: false,
        distance: sensor?.valid && sensor.distance_mm !== null ? sensor.distance_mm / 10 : null,
        ax: imu?.acceleration.x ?? null,
        ay: imu?.acceleration.y ?? null,
        az: imu?.acceleration.z ?? null,
        gx: imu?.gyroscope.x ?? null,
        gy: imu?.gyroscope.y ?? null,
        gz: imu?.gyroscope.z ?? null,
      };
      return i > 0 && sample.receivedAt - all[i - 1].receivedAt > 3000
        ? [{ ...row, time: sample.receivedAt - 1, distance: null, gap: true, ax: null, ay: null, az: null, gx: null, gy: null, gz: null }, row]
        : [row];
    });
}

const tick = { fontSize: 12, fill: '#2D3F87', fontFamily: 'inherit' };
const tooltipStyle = {
  borderRadius: 16,
  border: '1px solid #D5E6F7',
  fontSize: 13,
  color: '#0B1E6B',
  boxShadow: '0 12px 30px rgba(11, 30, 107, 0.15)',
};

export function DistanceChart({
  history,
  threshold,
  windowMinutes,
  setWindowMinutes,
  currentlyInvalid = false,
}: {
  history: Sample[];
  threshold: number;
  windowMinutes: number;
  setWindowMinutes: (n: number) => void;
  currentlyInvalid?: boolean;
}) {
  // Invalid readings are omitted from the curve so real >3 s connection gaps stay distinct.
  const rows = useMemo(
    () => chartRows(history, windowMinutes).filter(row => row.gap || row.distance !== null),
    [history, windowMinutes],
  );

  const hasInvalidInWindow = useMemo(() => {
    const cutoff = (history.at(-1)?.receivedAt ?? Date.now()) - windowMinutes * 60_000;
    return history.some(
      s => s.receivedAt >= cutoff && (!s.telemetry.sensors.vl53l0x || !s.telemetry.sensors.vl53l0x.valid),
    );
  }, [history, windowMinutes]);

  const validDistances = rows.map(r => r.distance).filter((d): d is number => d !== null);
  const summaryLabel = validDistances.length
    ? `Gráfico temporal de distância em centímetros com limite em ${number(threshold / 10, 0)} cm. Última válida: ${number(validDistances.at(-1))} cm; mínima: ${number(Math.min(...validDistances))} cm; máxima: ${number(Math.max(...validDistances))} cm.`
    : 'Gráfico temporal de distância em centímetros e limite de alerta. Sem medições válidas na janela.';

  return (
    <section className="panel distance-chart" aria-labelledby="distance-chart-heading">
      <div className="panel-heading">
        <h2 id="distance-chart-heading">
          <ChartNoAxesCombined size={18} aria-hidden="true" />
          Distância ao longo do tempo
        </h2>
        <div className="segmented compact" role="group" aria-label="Janela do gráfico">
          {[1, 5].map(n => (
            <button
              key={n}
              type="button"
              aria-pressed={windowMinutes === n}
              className={windowMinutes === n ? 'selected' : ''}
              onClick={() => setWindowMinutes(n)}
            >
              {n} min
            </button>
          ))}
        </div>
      </div>

      <div className="chart-meta">
        <span>
          Distância <span className="unit">(cm)</span>
        </span>
        <span className="legend">
          <span className="legend-item">
            <i className="line-key" aria-hidden="true" />
            VL53L0X
          </span>
          <span className="legend-item">
            <i className="dash-key" aria-hidden="true" />
            Limite ({number(threshold / 10, 0)} cm)
          </span>
        </span>
      </div>

      <div className="chart-area" role="img" aria-label={summaryLabel}>
        {rows.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#D5E6F7" />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={v => time(Number(v))}
                tick={tick}
                axisLine={false}
                tickLine={false}
                minTickGap={56}
              />
              <YAxis
                tick={tick}
                axisLine={false}
                tickLine={false}
                domain={[0, (max: number) => Math.max(180, Math.ceil(max / 50) * 50)]}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={v => time(Number(v))}
                formatter={v => [`${number(Number(v))} cm`, 'Distância']}
              />
              <ReferenceLine y={threshold / 10} stroke="#D92D20" strokeDasharray="5 5" />
              <Area
                type="monotone"
                dataKey="distance"
                stroke="#0A4FE0"
                fill="#5BB5F5"
                fillOpacity={0.22}
                strokeWidth={2.2}
                isAnimationActive={false}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">As medições aparecerão aqui após a conexão.</div>
        )}
      </div>

      <p className="chart-caption">
        {currentlyInvalid || hasInvalidInWindow
          ? 'Leituras inválidas (RangeStatus diferente de 0) são omitidas da curva; interrupções maiores que 3 s indicam perda de telemetria.'
          : 'Interrupções na curva indicam ausência de pacotes por mais de 3 s.'}
      </p>
    </section>
  );
}

export function MotionChart({
  kind,
  history,
  current,
  windowMinutes,
}: {
  kind: 'acceleration' | 'gyroscope';
  history: Sample[];
  current: Telemetry | null;
  windowMinutes: number;
}) {
  const rows = useMemo(() => chartRows(history, windowMinutes), [history, windowMinutes]);
  const accel = kind === 'acceleration';
  const values = current?.sensors.mpu6500?.[kind];
  const unit = accel ? 'm/s²' : '°/s';
  const headingId = accel ? 'accel-chart-heading' : 'gyro-chart-heading';

  const summaryLabel = `${accel ? 'Aceleração' : 'Velocidade angular'} nos eixos X, Y e Z, em ${unit}. ${
    values
      ? `Leitura atual: X ${number(values.x, 2)}, Y ${number(values.y, 2)}, Z ${number(values.z, 2)} ${unit}.`
      : 'Sem leitura ativa.'
  }`;

  return (
    <section className="panel motion-chart" aria-labelledby={headingId}>
      <div className="panel-heading">
        <h2 id={headingId}>
          {accel ? <Activity size={18} aria-hidden="true" /> : <MoveHorizontal size={18} aria-hidden="true" />}
          {accel ? 'Acelerômetro' : 'Giroscópio'}
        </h2>
        <span className="sensor-label">MPU6500</span>
      </div>

      <div className="axis-values">
        {(['x', 'y', 'z'] as const).map((axis, i) => (
          <div key={axis}>
            <span className="axis-label">
              <i style={{ background: axisColors[i] }} aria-hidden="true" />
              Eixo {axis.toUpperCase()}
            </span>
            <strong>{number(values?.[axis], 2)}</strong>
            <small>{unit}</small>
          </div>
        ))}
      </div>

      <div className="motion-chart-area" role="img" aria-label={summaryLabel}>
        {rows.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, left: -14, right: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#D5E6F7" />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={v => time(Number(v))}
                tick={tick}
                axisLine={false}
                tickLine={false}
                minTickGap={56}
              />
              <YAxis tick={tick} axisLine={false} tickLine={false} domain={accel ? [-2, 12] : [-3, 3]} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={v => time(Number(v))}
                formatter={(v, name) => [`${number(Number(v), 2)} ${unit}`, String(name).slice(1).toUpperCase()]}
              />
              {['x', 'y', 'z'].map((axis, i) => (
                <Line
                  key={axis}
                  type="monotone"
                  dataKey={`${accel ? 'a' : 'g'}${axis}`}
                  stroke={axisColors[i]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Aguardando amostras do sensor</div>
        )}
      </div>
    </section>
  );
}
