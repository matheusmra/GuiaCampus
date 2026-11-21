'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bluetooth,
  BluetoothOff,
  BookOpen,
  Check,
  ChevronDown,
  CirclePause,
  Cpu,
  Glasses,
  Info,
  LayoutDashboard,
  Menu,
  Play,
  Settings2,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useTelemetry } from '@/hooks/use-telemetry';
import { BLE_DEVICE_NAME, BLE_SERVICE_UUID, BLE_TELEMETRY_UUID, FIRMWARE_INTERVAL_MS } from '@/lib/telemetry/ble-protocol';
import type { Mode, Sample, Scenario } from '@/lib/telemetry/types';
import { number, time } from '@/lib/utils';
import { DistanceCard, OrientationCard, MotorStatus } from './sensor-cards';
import { DistanceChart, MotionChart } from './charts';
import { EventLog } from './event-log';

type View = 'overview' | 'events';
type SafetyState = 'offline' | 'paused' | 'loading' | 'close' | 'invalid' | 'clear';

const navigation = [
  { id: 'overview' as const, name: 'Monitoramento', icon: LayoutDashboard },
  { id: 'events' as const, name: 'Eventos', icon: Activity },
];

function exportHistory(history: Sample[], mode: Mode): string {
  const header =
    'modo,recebido_em,device_id,timestamp_ms,origem_configuracao,pwm_configurado,distance_mm,range_status,valid,ax,ay,az,gx,gy,gz,pitch,roll,motor_active,pwm,threshold_mm';
  const safeCell = (value: unknown) => {
    const text = String(value ?? '');
    return '"' + (/^[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
  };
  const rows = history.map(({ receivedAt, telemetry: d }) => {
    const s = d.sensors.vl53l0x;
    const m = d.sensors.mpu6500;
    return [
      mode === 'demo' ? 'DEMONSTRACAO' : 'REAL',
      new Date(receivedAt).toISOString(),
      d.device_id,
      d.timestamp_ms,
      d.settings.source ?? 'telemetria',
      d.actuator.configured_pwm ?? d.actuator.pwm,
      s?.valid ? s.distance_mm : null,
      s?.range_status,
      s?.valid,
      m?.acceleration.x,
      m?.acceleration.y,
      m?.acceleration.z,
      m?.gyroscope.x,
      m?.gyroscope.y,
      m?.gyroscope.z,
      m?.orientation.pitch,
      m?.orientation.roll,
      d.actuator.motor_active,
      d.actuator.pwm,
      d.settings.distance_threshold_mm,
    ]
      .map(safeCell)
      .join(',');
  });
  const filename = `guiacampus-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
  const url = URL.createObjectURL(new Blob(['\uFEFF', header, '\n', rows.join('\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export function Dashboard() {
  const [mode, setMode] = useState<Mode>('demo');
  const [view, setView] = useState<View>('overview');
  const [windowMinutes, setWindowMinutes] = useState(5);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  return (
    <TelemetryWorkspace
      key={mode}
      mode={mode}
      setMode={setMode}
      view={view}
      setView={setView}
      windowMinutes={windowMinutes}
      setWindowMinutes={setWindowMinutes}
      diagnosticsOpen={diagnosticsOpen}
      setDiagnosticsOpen={setDiagnosticsOpen}
    />
  );
}

function TelemetryWorkspace({
  mode,
  setMode,
  view,
  setView,
  windowMinutes,
  setWindowMinutes,
  diagnosticsOpen,
  setDiagnosticsOpen,
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  view: View;
  setView: (view: View) => void;
  windowMinutes: number;
  setWindowMinutes: (n: number) => void;
  diagnosticsOpen: boolean;
  setDiagnosticsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const [paused, setPaused] = useState(false);
  const [interval, setInterval] = useState(750);
  const [scenario, setScenario] = useState<Scenario>('automatic');
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [urgentAnnouncement, setUrgentAnnouncement] = useState('');
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  const sidebarRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeNavRef = useRef<HTMLButtonElement | null>(null);
  const prevSafetyRef = useRef<SafetyState | null>(null);
  const prevConnectionRef = useRef<string | null>(null);
  const wasMobileNavOpenRef = useRef(false);

  const { data, history, events, connection, lastUpdate, error, clearEvents, bleStatus, connectBle, disconnectBle } =
    useTelemetry(mode, interval, paused, scenario);

  const fresh = connection === 'online' && !paused ? data : null;
  const rawDistanceSensor = fresh?.sensors.vl53l0x ?? null;
  const rawDistanceValid = Boolean(rawDistanceSensor?.valid && rawDistanceSensor.distance_mm !== null);
  const heldSample = history.findLast(s => s.telemetry.sensors.vl53l0x?.valid);
  // Hold the last valid distance across brief isolated invalid reads (up to 2 s), always marked as uncertain.
  const holdingStale = Boolean(
    fresh &&
      !rawDistanceValid &&
      rawDistanceSensor &&
      heldSample &&
      lastUpdate !== null &&
      lastUpdate - heldSample.receivedAt <= 2000,
  );
  const staleAgeMs =
    holdingStale && lastUpdate !== null && heldSample ? Math.max(0, lastUpdate - heldSample.receivedAt) : null;
  const distanceData =
    holdingStale && heldSample && fresh
      ? { ...fresh, sensors: { ...fresh.sensors, vl53l0x: heldSample.telemetry.sensors.vl53l0x } }
      : fresh;
  const distanceUnknown = Boolean(fresh && !rawDistanceValid);

  const online = connection === 'online';
  const bleBusy = ['selecting', 'connecting', 'reconnecting'].includes(bleStatus);
  const alertCount = events.filter(e => e.level !== 'info').length;
  const viewTitle = view === 'overview' ? 'Monitoramento' : 'Histórico de eventos';

  const changeView = useCallback(
    (next: View) => {
      setView(next);
      setMobileNav(false);
    },
    [setView],
  );

  // Sync mobile viewport state and apply inert on closed off-screen drawer so Tab skips hidden controls.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const sync = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setMobileNav(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const el = sidebarRef.current as (HTMLElement & { inert: boolean }) | null;
    if (el) el.inert = isMobile && !mobileNav;
  }, [isMobile, mobileNav]);

  // Manage mobile navigation drawer focus, Tab trap, and Escape dismissal.
  useEffect(() => {
    if (mobileNav) {
      wasMobileNavOpenRef.current = true;
      closeNavRef.current?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setMobileNav(false);
          return;
        }
        if (e.key === 'Tab' && sidebarRef.current) {
          const focusables = Array.from(
            sidebarRef.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'),
          );
          if (!focusables.length) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    } else if (wasMobileNavOpenRef.current) {
      wasMobileNavOpenRef.current = false;
      menuButtonRef.current?.focus();
    }
  }, [mobileNav]);

  // Keyboard accelerators for power and screen-reader users (Alt+P, Alt+D, Alt+1, Alt+2).
  useEffect(() => {
    const onShortcut = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || settings || help || mobileNav) return;
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (key === 'p') {
        e.preventDefault();
        setPaused(prev => {
          const next = !prev;
          setStatusAnnouncement(next ? 'Monitoramento pausado.' : 'Monitoramento retomado.');
          return next;
        });
      } else if (key === 'd') {
        e.preventDefault();
        setView('overview');
        setDiagnosticsOpen(prev => {
          const next = !prev;
          setStatusAnnouncement(next ? 'Diagnóstico técnico expandido.' : 'Diagnóstico técnico recolhido.');
          return next;
        });
      } else if (key === '1') {
        e.preventDefault();
        setView('overview');
        setStatusAnnouncement('Visualização Monitoramento selecionada.');
      } else if (key === '2') {
        e.preventDefault();
        setView('events');
        setStatusAnnouncement('Visualização Histórico de eventos selecionada.');
      }
    };
    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  }, [settings, help, mobileNav, setDiagnosticsOpen, setView]);

  // Transition-gated ARIA live announcements for safety and connection state changes.
  useEffect(() => {
    const currentSafety: SafetyState = paused
      ? 'paused'
      : connection === 'offline'
        ? 'offline'
        : connection === 'loading' || !fresh
          ? 'loading'
          : !rawDistanceValid
            ? 'invalid'
            : rawDistanceSensor!.distance_mm! <= fresh.settings.distance_threshold_mm
              ? 'close'
              : 'clear';

    if (prevConnectionRef.current !== null && prevConnectionRef.current !== connection) {
      if (connection === 'online') {
        setStatusAnnouncement(
          mode === 'demo' ? 'Modo Demonstração conectado com dados simulados.' : 'Telemetria BLE recebida dos óculos.',
        );
      }
    }
    prevConnectionRef.current = connection;

    if (prevSafetyRef.current !== null && prevSafetyRef.current !== currentSafety) {
      if (currentSafety === 'close' && fresh?.sensors.vl53l0x?.distance_mm != null) {
        const cmText = number(fresh.sensors.vl53l0x.distance_mm / 10);
        setUrgentAnnouncement(
          `Atenção: obstáculo próximo a ${cmText} centímetros. ${fresh.actuator.motor_active ? 'Motor de vibração acionado.' : ''}`,
        );
      } else if (currentSafety === 'invalid') {
        setUrgentAnnouncement(
          'Atenção: medição de distância indisponível, risco desconhecido. O motor permanece desligado.',
        );
      } else if (currentSafety === 'clear' && (prevSafetyRef.current === 'close' || prevSafetyRef.current === 'invalid')) {
        setStatusAnnouncement('Leitura de distância normalizada acima do limite de alerta.');
      }
    }
    prevSafetyRef.current = currentSafety;
  }, [connection, paused, fresh, rawDistanceValid, rawDistanceSensor, mode]);

  useEffect(() => {
    if (!exportStatus) return;
    const timer = setTimeout(() => setExportStatus(null), 5000);
    return () => clearTimeout(timer);
  }, [exportStatus]);

  const handleExport = () => {
    const filename = exportHistory(history, mode);
    const msg = `Exportado: ${filename}`;
    setExportStatus(msg);
    setStatusAnnouncement(`Arquivo CSV exportado: ${filename}.`);
  };

  const badgeClass = paused
    ? 'paused'
    : online
      ? mode === 'demo'
        ? 'sim'
        : 'online'
      : connection === 'loading'
        ? 'paused'
        : 'offline';

  const badgeLabel = paused
    ? 'Pausado'
    : online
      ? mode === 'demo'
        ? 'Simulado'
        : 'Conectado'
      : connection === 'loading'
        ? 'Conectando'
        : 'Desconectado';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>

      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {urgentAnnouncement}
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </div>

      {mobileNav && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Fechar menu de navegação"
          onClick={() => setMobileNav(false)}
        />
      )}

      <aside
        id="sidebar-nav"
        ref={sidebarRef}
        aria-label="Navegação lateral"
        aria-hidden={isMobile && !mobileNav ? true : undefined}
        className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-head">
          <Link className="brand" href="/" aria-label="GuiaCampus — voltar à apresentação do projeto">
            <img
              src="/logos/guiacampus-horizontal-assinatura.svg"
              alt="GuiaCampus — Navegação assistida e IoT"
              width={186}
              height={46}
              className="brand-logo"
            />
          </Link>
          <button
            ref={closeNavRef}
            type="button"
            className="sidebar-mobile-close"
            aria-label="Fechar navegação"
            onClick={() => setMobileNav(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="nav-section-list" aria-label="Navegação principal">
          {navigation.map(item => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => changeView(item.id)}
            >
              <item.icon size={19} aria-hidden="true" />
              <span>{item.name}</span>
              {item.id === 'events' && alertCount > 0 && (
                <span className="nav-counter" aria-label={`${alertCount} alertas registrados`}>
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-secondary">
          <button
            type="button"
            className="nav-item"
            onClick={() => {
              setMobileNav(false);
              setSettings(true);
            }}
          >
            <Settings2 size={19} aria-hidden="true" />
            <span>Configurações</span>
          </button>
          <button
            type="button"
            className="nav-item"
            onClick={() => {
              setMobileNav(false);
              setHelp(true);
            }}
          >
            <BookOpen size={19} aria-hidden="true" />
            <span>Como conectar</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
          <Link href="/" className="nav-item" onClick={() => setMobileNav(false)}>
            <Glasses size={19} aria-hidden="true" />
            <span>Apresentação do projeto</span>
          </Link>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-version">
            <span
              className={`status-dot ${online && !paused ? 'green' : paused || connection === 'loading' ? 'amber' : 'gray'}`}
              aria-hidden="true"
            />
            <span>ESP32-C3 BLE · v0.1.0</span>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              ref={menuButtonRef}
              type="button"
              className="mobile-menu"
              aria-label="Abrir menu de navegação"
              aria-expanded={mobileNav}
              aria-controls="sidebar-nav"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={21} aria-hidden="true" />
            </button>
            <div className="topbar-context">
              <span>GuiaCampus</span>
              <span aria-hidden="true">/</span>
              <strong>{viewTitle}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <Button variant="ghost" size="sm" onClick={() => setSettings(true)}>
              <Settings2 size={16} aria-hidden="true" />
              Configurações
            </Button>
          </div>
        </header>

        <main id="main">
          <div className="page-heading">
            <div className="page-heading-copy">
              <h1>{viewTitle}</h1>
              <p className="page-subtitle">
                {mode === 'demo'
                  ? 'Sessão de demonstração com dados simulados para testes e acompanhamento.'
                  : 'Monitoramento direto dos óculos GuiaCampus-01 via Bluetooth LE.'}
              </p>
            </div>
            <div className="page-actions">
              {exportStatus && (
                <span className="export-feedback" role="status">
                  {exportStatus}
                </span>
              )}
              <Button variant="outline" onClick={handleExport} disabled={!history.length}>
                <ArrowDownToLine size={16} aria-hidden="true" />
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className="connection-bar">
            <div className="device-id">
              <span className="chip-icon" aria-hidden="true">
                <Cpu size={20} />
              </span>
              <div className="device-id-meta">
                <strong>{data?.device_id ?? BLE_DEVICE_NAME}</strong>
                <span>{mode === 'demo' ? 'Simulação local no navegador' : 'ESP32-C3 Mini · BLE'}</span>
              </div>
              <span className={`connection-badge ${badgeClass}`}>
                <i aria-hidden="true" />
                {badgeLabel}
              </span>
            </div>

            <div className="connection-meta">
              <span className="last-update">
                Última leitura <strong>{lastUpdate ? time(lastUpdate) : '—'}</strong>
              </span>

              {mode === 'real' &&
                (bleStatus === 'connected' || bleBusy ? (
                  <Button variant="outline" size="sm" onClick={disconnectBle}>
                    {bleBusy ? 'Cancelar' : 'Desconectar'}
                  </Button>
                ) : (
                  <Button size="sm" disabled={bleStatus === 'unsupported'} onClick={connectBle}>
                    <Bluetooth size={15} aria-hidden="true" />
                    Conectar BLE
                  </Button>
                ))}

              <div className="segmented mode-switch" role="group" aria-label="Modo de operação">
                <button
                  type="button"
                  aria-pressed={mode === 'real'}
                  className={mode === 'real' ? 'selected' : ''}
                  onClick={() => setMode('real')}
                >
                  Real
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'demo'}
                  className={mode === 'demo' ? 'selected' : ''}
                  onClick={() => setMode('demo')}
                >
                  Demo
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                aria-pressed={paused}
                onClick={() => {
                  const next = !paused;
                  setPaused(next);
                  setStatusAnnouncement(next ? 'Monitoramento pausado.' : 'Monitoramento retomado.');
                }}
                title={paused ? 'Retomar telemetria (Alt+P)' : 'Pausar telemetria (Alt+P)'}
              >
                {paused ? <Play size={15} aria-hidden="true" /> : <CirclePause size={15} aria-hidden="true" />}
                {paused ? 'Retomar' : 'Pausar'}
              </Button>
            </div>
          </div>

          {mode === 'demo' && (
            <div className="demo-banner" role="note">
              <div className="demo-banner-copy">
                <Info size={18} aria-hidden="true" />
                <span>
                  <strong>Modo Demonstração:</strong> os valores exibidos são simulados e não representam leituras de um protótipo físico conectado.
                </span>
              </div>
              <div className="demo-banner-actions">
                <Button variant="outline" size="sm" onClick={() => setSettings(true)}>
                  Trocar cenário
                </Button>
                <Button size="sm" onClick={() => setMode('real')}>
                  Usar modo Real
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner" role="alert">
              <div className="error-banner-body">
                <BluetoothOff size={20} aria-hidden="true" />
                <div>
                  <strong>{mode === 'demo' ? 'Simulação interrompida' : 'Sem conexão BLE'}</strong>
                  <p>{error}</p>
                </div>
              </div>
              {bleStatus === 'unsupported' ? (
                <Button variant="outline" size="sm" onClick={() => setMode('demo')}>
                  Voltar ao modo Demonstração
                </Button>
              ) : mode === 'real' && bleStatus === 'idle' ? (
                <Button size="sm" onClick={connectBle}>
                  <Bluetooth size={15} aria-hidden="true" />
                  Tentar conectar
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setSettings(true)}>
                  Abrir configurações
                </Button>
              )}
            </div>
          )}

          {mode === 'real' && bleStatus === 'idle' && !error && (
            <section className="ble-connection-panel" aria-label="Pareamento Bluetooth LE">
              <div className="ble-connection-copy">
                <div className="ble-connection-icon" aria-hidden="true">
                  <Bluetooth size={22} />
                </div>
                <div>
                  <strong>Conecte os óculos GuiaCampus-01</strong>
                  <p>
                    Ligue o ESP32-C3 e selecione Conectar GuiaCampus-01 para autorizar o pareamento Bluetooth LE no navegador Chrome.
                  </p>
                </div>
              </div>
              <div className="ble-connection-actions">
                <Button onClick={connectBle}>
                  <Bluetooth size={16} aria-hidden="true" />
                  Conectar GuiaCampus-01
                </Button>
                <Button variant="outline" onClick={() => setHelp(true)}>
                  Como conectar
                </Button>
              </div>
            </section>
          )}

          {paused && (
            <div className="pause-banner" role="status">
              <span className="pause-banner-copy">
                <CirclePause size={18} aria-hidden="true" />
                <span>Monitoramento na tela pausado. Os óculos continuam operando normalmente.</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPaused(false);
                  setStatusAnnouncement('Monitoramento retomado.');
                }}
              >
                Retomar
              </Button>
            </div>
          )}

          {view === 'overview' ? (
            <>
              <div className="primary-safety-grid">
                <DistanceCard
                  data={distanceData}
                  loading={connection === 'loading'}
                  paused={paused}
                  holdingStale={holdingStale}
                  staleAgeMs={staleAgeMs}
                  rawRangeStatus={rawDistanceSensor?.range_status ?? null}
                />
                <MotorStatus data={fresh} distanceUnknown={distanceUnknown} paused={paused} />
              </div>

              <section className="diagnostics-section" aria-label="Diagnóstico técnico de sensores">
                <button
                  type="button"
                  className="disclosure-toggle"
                  aria-expanded={diagnosticsOpen}
                  aria-controls="technical-diagnostics"
                  onClick={() => setDiagnosticsOpen(prev => !prev)}
                >
                  <span className="disclosure-title">
                    <Activity size={18} aria-hidden="true" />
                    Diagnóstico técnico (IMU e gráficos)
                  </span>
                  <span className="disclosure-meta">
                    <span>{diagnosticsOpen ? 'Ocultar gráficos e orientação' : 'Expandir gráficos e orientação'}</span>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={`disclosure-chevron ${diagnosticsOpen ? 'open' : ''}`}
                    />
                  </span>
                </button>

                {diagnosticsOpen && (
                  <div id="technical-diagnostics" className="diagnostics-content">
                    <div className="diagnostics-top-grid">
                      <DistanceChart
                        history={history}
                        threshold={data?.settings.distance_threshold_mm ?? 500}
                        windowMinutes={windowMinutes}
                        setWindowMinutes={setWindowMinutes}
                        currentlyInvalid={distanceUnknown}
                      />
                      <OrientationCard data={fresh} />
                    </div>
                    <div className="diagnostics-motion-grid">
                      <MotionChart kind="acceleration" history={history} current={fresh} windowMinutes={windowMinutes} />
                      <MotionChart kind="gyroscope" history={history} current={fresh} windowMinutes={windowMinutes} />
                    </div>
                  </div>
                )}
              </section>

              <EventLog
                events={events}
                active={online && !paused}
                clearEvents={clearEvents}
                onSeeAll={() => changeView('events')}
                onCleared={() => setStatusAnnouncement('Histórico de eventos limpo.')}
              />
            </>
          ) : (
            <EventLog
              events={events}
              detailed
              active={online && !paused}
              clearEvents={clearEvents}
              onCleared={() => setStatusAnnouncement('Histórico de eventos limpo.')}
            />
          )}

          <footer className="footer">
            <span>
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Alertas físicos operam de forma autônoma no dispositivo.</span>
            </span>
            <span>Atalhos: Alt+P pausar, Alt+D diagnóstico, Alt+1/2 alternar visão.</span>
          </footer>
        </main>
      </div>

      <Dialog
        open={settings}
        onOpenChange={setSettings}
        title="Configurações de monitoramento"
        description="Ajuste a visualização e a coleta de dados desta sessão."
      >
        {mode === 'demo' && (
          <div className="settings-group">
            <label htmlFor="refresh">Intervalo da simulação</label>
            <select id="refresh" value={interval} onChange={e => setInterval(Number(e.target.value))}>
              <option value={500}>500 ms · mais frequente</option>
              <option value={750}>750 ms · equilibrado</option>
              <option value={1000}>1 segundo · menor carga</option>
            </select>
            <p>
              No modo Real, a frequência das notificações é definida no firmware ({FIRMWARE_INTERVAL_MS} ms + tempo de leitura).
            </p>
          </div>
        )}

        <div className="settings-group">
          <label htmlFor="window">Janela dos gráficos</label>
          <select id="window" value={windowMinutes} onChange={e => setWindowMinutes(Number(e.target.value))}>
            <option value={1}>1 minuto (1 min)</option>
            <option value={5}>5 minutos (5 min)</option>
          </select>
        </div>

        {mode === 'demo' ? (
          <div className="settings-group">
            <label htmlFor="scenario">Cenário da demonstração</label>
            <select id="scenario" value={scenario} onChange={e => setScenario(e.target.value as Scenario)}>
              <option value="automatic">Ciclo automático de medições</option>
              <option value="obstacle">Obstáculo próximo</option>
              <option value="invalid">Medição inválida · RangeStatus 4</option>
              <option value="sensor-offline">VL53L0X desconectado</option>
              <option value="offline">Dispositivo offline</option>
            </select>
            <p>Os cenários afetam somente os dados simulados.</p>
          </div>
        ) : (
          <div className="settings-group">
            <h3 className="settings-subtitle">Dispositivo Bluetooth LE</h3>
            <div className="code-block">
              Nome: {BLE_DEVICE_NAME}
              <br />
              Serviço: {BLE_SERVICE_UUID}
              <br />
              Telemetria: {BLE_TELEMETRY_UUID}
            </div>
            <p>
              Use Conectar GuiaCampus-01 na tela principal. Requer Web Bluetooth em HTTPS ou localhost. Não é necessário configurar IP.
            </p>
          </div>
        )}

        <div className="settings-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>
            O limite (500 mm) e a intensidade configurada (160/255) vêm do código do firmware, não do pacote BLE. O PWM aplicado atual é recebido no byte 19. A central apenas monitora.
          </span>
        </div>

        <div className="settings-note">
          <Info size={18} aria-hidden="true" />
          <span>
            Atalhos de teclado: Alt+P para pausar/retomar, Alt+D para diagnóstico técnico, Alt+1 para Monitoramento e Alt+2 para Eventos.
          </span>
        </div>

        <Button className="dialog-done" onClick={() => setSettings(false)}>
          <Check size={16} aria-hidden="true" />
          Concluir
        </Button>
      </Dialog>

      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="Conecte o seu GuiaCampus"
        description="Do protótipo à central web, diretamente por Bluetooth LE."
      >
        <ol className="help-steps">
          <li>
            <span>1</span>
            <div>
              <strong>Prepare o firmware</strong>
              <p>
                Use o sketch em <code>Codigo/esp32/guiacampus</code>. Grave o firmware BLE e confirme o anúncio GuiaCampus-01 no monitor serial.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Prepare o navegador</strong>
              <p>
                Abra no Chrome para computador ou Android, em HTTPS ou localhost. Habilite o Bluetooth do aparelho. Safari e Firefox não oferecem suporte a este fluxo.
              </p>
              <div className="code-block">
                Nome BLE: {BLE_DEVICE_NAME}
                <br />
                Serviço: {BLE_SERVICE_UUID}
              </div>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Inicie o monitoramento</strong>
              <p>
                Selecione Real, clique em Conectar GuiaCampus-01 e escolha o dispositivo no seletor do navegador. Após uma queda, a aplicação tenta reconectar automaticamente.
              </p>
            </div>
          </li>
        </ol>

        <div className="settings-note">
          <Terminal size={18} aria-hidden="true" />
          <span>O README do projeto reúne dependências, conexões e detalhes do contrato de telemetria.</span>
        </div>

        {mode === 'real' && bleStatus !== 'unsupported' ? (
          <Button
            className="dialog-done"
            onClick={() => {
              setHelp(false);
              connectBle();
            }}
          >
            <Bluetooth size={16} aria-hidden="true" />
            Conectar GuiaCampus-01
          </Button>
        ) : (
          <Button
            className="dialog-done"
            onClick={() => {
              setHelp(false);
              setMode('real');
            }}
          >
            Ir para modo Real <ArrowRight size={15} aria-hidden="true" />
          </Button>
        )}
      </Dialog>
    </div>
  );
}
