import { ArrowRight, Bluetooth, CircleAlert, History, Radio, TriangleAlert, Vibrate, X } from 'lucide-react';
import type { TelemetryEvent } from '@/lib/telemetry/types';
import { time } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function EventLog({
  events,
  detailed = false,
  active = true,
  clearEvents,
  onSeeAll,
  onCleared,
}: {
  events: TelemetryEvent[];
  detailed?: boolean;
  active?: boolean;
  clearEvents: () => void;
  onSeeAll?: () => void;
  onCleared?: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'alerts'>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!events.length && confirmClear) setConfirmClear(false);
  }, [events.length, confirmClear]);

  const filtered = events.filter(e => filter === 'all' || e.level !== 'info');

  return (
    <section className="panel event-panel" aria-labelledby="events-heading">
      <div className="panel-heading">
        <h2 id="events-heading">
          <History size={18} aria-hidden="true" />
          Eventos recentes <span className="count-badge">{events.length}</span>
        </h2>

        {detailed ? (
          <div className="event-heading-actions">
            {!confirmClear ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={!events.length}
                onClick={() => setConfirmClear(true)}
              >
                <X size={15} aria-hidden="true" />
                Limpar histórico
              </Button>
            ) : null}
          </div>
        ) : (
          <button type="button" className="text-button" onClick={onSeeAll}>
            Ver todos <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {detailed && confirmClear && (
        <div className="event-confirm-bar" role="region" aria-label="Confirmar limpeza do histórico">
          <span>Apagar todos os {events.length} eventos registrados nesta sessão?</span>
          <div className="event-confirm-actions">
            <Button
              size="sm"
              onClick={() => {
                clearEvents();
                setConfirmClear(false);
                onCleared?.();
              }}
            >
              Confirmar limpeza
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmClear(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {detailed && (
        <div className="event-filters">
          <div className="segmented" role="group" aria-label="Filtrar eventos">
            <button
              type="button"
              aria-pressed={filter === 'all'}
              className={filter === 'all' ? 'selected' : ''}
              onClick={() => setFilter('all')}
            >
              Todos os eventos
            </button>
            <button
              type="button"
              aria-pressed={filter === 'alerts'}
              className={filter === 'alerts' ? 'selected' : ''}
              onClick={() => setFilter('alerts')}
            >
              Alertas e falhas
            </button>
          </div>
          <span>Até 120 eventos nesta sessão</span>
        </div>
      )}

      <div className="event-table-wrap">
        <table className="event-table">
          <thead>
            <tr>
              <th>Horário</th>
              <th>Evento</th>
              <th>Origem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, detailed ? 120 : 4).map(event => {
              const Icon =
                event.kind === 'fall'
                  ? TriangleAlert
                  : event.kind === 'motor'
                    ? Vibrate
                    : event.kind === 'connection'
                      ? Bluetooth
                      : event.kind === 'obstacle'
                        ? Radio
                        : CircleAlert;
              const iconClass =
                event.level === 'info'
                  ? 'event-icon-info'
                  : event.level === 'warning'
                    ? 'event-icon-warning'
                    : 'event-icon-error';
              return (
                <tr key={event.id}>
                  <td className="event-time" data-label="Horário">
                    {time(event.timestamp)}
                  </td>
                  <td data-label="Evento">
                    <span className="event-description">
                      <Icon size={16} className={iconClass} aria-hidden="true" />
                      <span>{event.description}</span>
                    </span>
                  </td>
                  <td data-label="Origem">
                    <span className="event-source">{event.source}</span>
                  </td>
                  <td data-label="Status">
                    <span className={`event-level ${event.level}`}>
                      {event.level === 'info' ? 'Informação' : event.level === 'warning' ? 'Atenção' : 'Falha'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!filtered.length && (
          <div className="empty-events">
            <History size={24} aria-hidden="true" />
            <strong>{filter === 'alerts' ? 'Nenhum alerta registrado' : 'Nenhum evento nesta sessão'}</strong>
            <span>As mudanças de estado aparecerão aqui automaticamente.</span>
          </div>
        )}
      </div>

      <div className="event-foot">
        <span className={`live-dot ${active ? 'green' : 'gray'}`} aria-hidden="true" />
        <span>Histórico temporário da sessão</span>
      </div>
    </section>
  );
}
