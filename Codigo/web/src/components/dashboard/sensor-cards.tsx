import { ArrowDownUp, Check, CircleAlert, Focus, Glasses, Radar, ShieldCheck, Vibrate } from 'lucide-react';
import type { Telemetry } from '@/lib/telemetry/types';
import { number } from '@/lib/utils';

export function DistanceCard({
  data,
  loading,
  paused,
  holdingStale = false,
  staleAgeMs = null,
  rawRangeStatus = null,
}: {
  data: Telemetry | null;
  loading: boolean;
  paused: boolean;
  holdingStale?: boolean;
  staleAgeMs?: number | null;
  rawRangeStatus?: number | null;
}) {
  const sensor = data?.sensors.vl53l0x;
  const valid = Boolean(sensor?.valid && sensor.distance_mm !== null);
  const close = valid && !holdingStale && sensor!.distance_mm! <= data!.settings.distance_threshold_mm;
  const unknownRisk = !loading && !paused && Boolean(data) && !valid;
  const cm = valid ? sensor!.distance_mm! / 10 : null;
  const threshold = data?.settings.distance_threshold_mm;
  const staleSeconds = staleAgeMs !== null ? Math.max(1, Math.round(staleAgeMs / 1000)) : 1;

  const stateClass =
    loading || paused || !data
      ? 'muted-text'
      : close
        ? 'alert-text'
        : holdingStale || unknownRisk
          ? 'warning-text'
          : 'success-text';

  const stateText = loading
    ? 'Aguardando primeira leitura'
    : paused
      ? 'Monitoramento pausado'
      : !data
        ? 'Sem leitura ativa'
        : holdingStale
          ? `Verificando leitura · última válida há ${staleSeconds} s (risco incerto)`
          : unknownRisk
            ? 'Medição indisponível · Risco desconhecido'
            : close
              ? 'Obstáculo próximo (alerta ativo)'
              : 'Acima do limite de alerta';

  const symbolClass = !valid || loading || paused ? 'muted' : close ? 'alert' : holdingStale ? 'warning' : '';

  return (
    <section
      aria-labelledby="distance-heading"
      className={`panel distance-card ${close ? 'proximity-alert' : unknownRisk || holdingStale ? 'unknown-risk' : ''}`}
    >
      <div className="panel-heading">
        <h2 id="distance-heading">
          <Radar size={18} strokeWidth={1.8} aria-hidden="true" />
          Distância do obstáculo
        </h2>
        <span className="sensor-label">VL53L0X</span>
      </div>

      <div className="distance-readout">
        {loading ? (
          <>
            <span className="skeleton reading-skeleton" aria-hidden="true" />
            <span className="sr-only">Carregando leitura de distância</span>
          </>
        ) : cm !== null ? (
          <>
            <span className="distance-number">{number(cm)}</span>
            <span className="distance-unit">cm</span>
          </>
        ) : (
          <span className="distance-number" aria-label="Medição indisponível">
            —
          </span>
        )}
        <div className={`distance-symbol ${symbolClass}`} aria-hidden="true">
          {close || unknownRisk || holdingStale ? (
            <CircleAlert size={28} strokeWidth={1.8} />
          ) : (
            <Focus size={28} strokeWidth={1.8} />
          )}
        </div>
      </div>

      <div className={`measurement-state ${stateClass}`}>
        {valid && !close && !holdingStale ? (
          <Check size={16} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" />
        )}
        <span>{stateText}</span>
      </div>

      {(unknownRisk || holdingStale) && (
        <p className="safety-helper">
          Status do sensor: RangeStatus {rawRangeStatus ?? 'indisponível'} — caminho livre não confirmado.
        </p>
      )}

      <div className="proximity-scale" aria-hidden="true">
        <div className="scale-track">
          <span className="scale-danger-zone" style={{ width: `${Math.min(100, (threshold ?? 500) / 20)}%` }} />
          <span className="scale-threshold" style={{ left: `${Math.min(100, (threshold ?? 500) / 20)}%` }} />
          {cm !== null && <span className="scale-pointer" style={{ left: `${Math.min(98, cm / 2)}%` }} />}
        </div>
        <div className="scale-labels">
          <span>0 cm</span>
          <span>100 cm</span>
          <span>200+ cm</span>
        </div>
      </div>

      <div className="distance-details">
        <span>
          Limite de alerta (firmware)
          <strong>{number(threshold == null ? null : threshold / 10, 0)} cm</strong>
        </span>
      </div>
    </section>
  );
}

export function OrientationCard({ data }: { data: Telemetry | null }) {
  const orientation = data?.sensors.mpu6500?.orientation;

  return (
    <section className="panel orientation-card" aria-labelledby="orientation-heading">
      <div className="panel-heading">
        <h2 id="orientation-heading">
          <ArrowDownUp size={18} aria-hidden="true" />
          Orientação da cabeça
        </h2>
        <span className="sensor-label">2D · MPU6500</span>
      </div>

      <div
        className="orientation-visual"
        role="img"
        aria-label={
          orientation
            ? `Inclinação (Pitch) ${number(orientation.pitch)} graus, rotação lateral (Roll) ${number(orientation.roll)} graus`
            : 'Orientação indisponível'
        }
      >
        <div className="attitude-circle">
          <div className="attitude-inner" />
          <div className="attitude-cross horizontal" />
          <div className="attitude-cross vertical" />
          <span className="compass-label top">0°</span>
          <span className="compass-label left">−90°</span>
          <span className="compass-label right">90°</span>
          <div
            className={`glasses-plane ${!orientation ? 'no-signal' : ''}`}
            style={{
              transform: `translateY(${Math.max(-25, Math.min(25, orientation?.pitch ?? 0))}px) rotate(${orientation?.roll ?? 0}deg)`,
            }}
          >
            <span className="wing left-wing" />
            <Glasses size={64} strokeWidth={1.5} aria-hidden="true" />
            <span className="wing right-wing" />
          </div>
          <span className="attitude-center" />
        </div>
      </div>

      <div className="orientation-values">
        <div>
          <span>
            Inclinação <small>(Pitch)</small>
          </span>
          <strong>
            {number(orientation?.pitch)}
            <small>°</small>
          </strong>
        </div>
        <div>
          <span>
            Rotação lateral <small>(Roll)</small>
          </span>
          <strong>
            {number(orientation?.roll)}
            <small>°</small>
          </strong>
        </div>
      </div>
    </section>
  );
}

export function MotorStatus({
  data,
  distanceUnknown,
  paused,
}: {
  data: Telemetry | null;
  distanceUnknown: boolean;
  paused: boolean;
}) {
  const active = Boolean(data?.actuator.motor_active);
  const appliedPwm = data ? (active ? data.actuator.pwm : 0) : null;
  const appliedPct = appliedPwm !== null ? Math.round((appliedPwm / 255) * 100) : null;
  const configuredPwm = data ? (data.actuator.configured_pwm ?? data.actuator.pwm) : null;
  const configuredPct = configuredPwm !== null ? Math.round((configuredPwm / 255) * 100) : null;

  const title = paused
    ? 'Monitoramento pausado'
    : !data
      ? 'Indisponível'
      : active
        ? 'Motor acionado'
        : distanceUnknown
          ? 'Motor desligado'
          : 'Em espera';

  const subtitle = paused
    ? 'Atuação física continua nos óculos'
    : !data
      ? 'Aguardando telemetria dos óculos'
      : active
        ? 'Alerta háptico ativo nos óculos'
        : distanceUnknown
          ? 'Distância incerta — risco desconhecido'
          : 'Pronto para alertar localmente';

  const pillTone = paused || !data ? 'neutral' : active || distanceUnknown ? 'warn' : 'ready';
  const pillLabel = paused
    ? 'Pausado'
    : !data
      ? 'Sem dados'
      : active
        ? 'Vibrando'
        : distanceUnknown
          ? 'Risco desconhecido'
          : 'Pronto';

  return (
    <section
      aria-labelledby="motor-heading"
      className={`panel motor-card ${!paused && data && (active || distanceUnknown) ? 'motor-warning' : ''}`}
    >
      <div className="panel-heading">
        <h2 id="motor-heading">
          <Vibrate size={18} strokeWidth={1.8} aria-hidden="true" />
          Motor de vibração
        </h2>
        <span className="sensor-label">Coin 1027</span>
      </div>

      <div className="motor-state">
        <div
          className={`motor-icon ${active ? 'active' : !paused && data && distanceUnknown ? 'warning' : ''}`}
          aria-hidden="true"
        >
          <Vibrate size={24} />
        </div>
        <div className="motor-state-copy">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <span className={`motor-status-pill ${pillTone}`}>
          <i aria-hidden="true" />
          {pillLabel}
        </span>
      </div>

      {!paused && data && !active && distanceUnknown && (
        <p className="motor-warning-note">
          Quando a leitura de distância é inválida, o motor desliga nos óculos; isso não indica caminho livre.
        </p>
      )}

      <div className="pwm-row">
        <span>Intensidade atual (BLE)</span>
        <strong>{appliedPct !== null ? `${appliedPct}%` : '—'}</strong>
      </div>

      <div
        className={`pwm-track ${active ? 'is-active' : ''}`}
        role="progressbar"
        aria-label="Intensidade aplicada ao motor de vibração"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={appliedPct ?? 0}
        aria-valuetext={appliedPct !== null ? `${appliedPct} por cento` : 'Indisponível'}
      >
        <span style={{ width: `${appliedPct ?? 0}%` }} />
      </div>

      <div className="motor-meta-list">
        <span>
          Configuração do firmware
          <strong>{configuredPct !== null ? `${configuredPct}% (${configuredPwm}/255)` : '—'}</strong>
        </span>
      </div>

      <div className="local-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>Alertas físicos operam localmente nos óculos (painel somente leitura).</span>
      </div>
    </section>
  );
}
