'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import {
  GLASSES_PARTS_INFO,
  GLASSES_PARTS_ORDER,
  OculosGuiaCampus3D,
  type GlassesPart,
} from '@/components/3d/oculos-guiacampus-3d';
import './landing.css';

const PACKET_FIELDS = [
  { label: 'Bytes 0–1', name: 'Distância', detail: 'uint16, mm' },
  { label: 'Bytes 2–7', name: 'Aceleração', detail: 'int16 / 100, m/s²' },
  { label: 'Bytes 8–13', name: 'Giroscópio', detail: 'int16 / 100, °/s' },
  { label: 'Bytes 14–17', name: 'Pitch e Roll', detail: 'int16 / 100, °' },
  { label: 'Byte 18', name: 'Validade', detail: 'Bit 7 IMU + RangeStatus' },
  { label: 'Byte 19', name: 'PWM motor', detail: 'uint8, 0–255 aplicado' },
];

const TEAM_STUDENTS = [
  'Gabriel Chaves Mendes',
  'Guilherme Henrique da Silva Teodoro',
  'Marcella Santos Belchior',
  'Matheus de Almeida Moreira',
  'Yasmin Torres Moreira dos Santos',
];

const TEAM_ADVISORS = [
  'Felipe Domingos da Cunha',
  'Luís Fabrício Wanderley Góes',
  'Matheus Alcântara Souza',
  'Max do Val Machado',
];

export function LandingPage() {
  const [selectedPart, setSelectedPart] = useState<GlassesPart>(null);

  return (
    <div className="lp-page">
      <a className="skip-link" href="#lp-main">
        Pular para o conteúdo
      </a>

      <header className="lp-header">
        <nav className="lp-nav" aria-label="Navegação principal">
          <Link className="lp-brand" href="/">
            <img
              src="/logos/guiacampus-horizontal.svg"
              alt="GuiaCampus"
              width={162}
              height={40}
              className="lp-brand-logo"
            />
          </Link>

          <div className="lp-nav-links">
            <a className="lp-nav-link" href="#problema">
              O problema
            </a>
            <a className="lp-nav-link" href="#arquitetura">
              Arquitetura
            </a>
            <a className="lp-nav-link" href="#central">
              Central BLE
            </a>
            <a className="lp-nav-link" href="#equipe">
              Equipe
            </a>
          </div>

          <Link className="lp-nav-cta" href="/monitor">
            Abrir central
            <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <main id="lp-main">
        <section className="lp-hero-band" aria-label="Apresentação do protótipo">
          <div className="lp-hero">
            <div className="lp-hero-thesis">
              <h1>Onde a bengala não alcança, o GuiaCampus avisa antes.</h1>
              <p>
                Galhos, placas e obstáculos na altura do rosto passam acima da bengala tradicional. Os óculos
                GuiaCampus medem a frente por laser ToF e vibram localmente na haste ao atingir 50 cm, enviando
                telemetria por Bluetooth LE direto para o navegador.
              </p>
              <div className="lp-hero-actions">
                <Link className="lp-cta-primary" href="/monitor">
                  Testar central BLE
                  <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
                </Link>
                <a className="lp-cta-secondary" href="#arquitetura">
                  Ver arquitetura real
                </a>
              </div>
            </div>

            <OculosGuiaCampus3D selectedPart={selectedPart} onSelectPart={setSelectedPart} />
          </div>

          <div className="lp-hw-strip-wrap">
            <div className="lp-hw-strip" role="group" aria-label="Inspecionar componentes no modelo 3D">
              {GLASSES_PARTS_ORDER.map(partKey => {
                const info = GLASSES_PARTS_INFO[partKey];
                const active = selectedPart === partKey;
                return (
                  <button
                    key={partKey}
                    type="button"
                    className="lp-hw-cell"
                    aria-pressed={active}
                    onClick={() => setSelectedPart(active ? null : partKey)}
                  >
                    <span className="lp-hw-code">{info.code}</span>
                    <strong>{info.name}</strong>
                    <span className="lp-hw-short">{info.short}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lp-band-white" id="problema" aria-labelledby="problema-heading">
          <div className="lp-section">
            <div className="lp-problem-grid">
              <div className="lp-prose">
                <h2 id="problema-heading">O ponto cego na altura da cabeça</h2>
                <p>
                  A bengala branca é indispensável para mapear desníveis, degraus e barreiras no solo, mas sua varredura
                  física não alcança obstáculos suspensos ou projetados na altura do tronco e do rosto.
                </p>
                <p>
                  O GuiaCampus atua como um para-choque virtual complementar em formato de óculos de proteção: sem exigir
                  fones de ouvido que bloqueiem a audição ambiental, ele traduz a proximidade frontal em vibração tátil na
                  haste esquerda.
                </p>

                <ul className="lp-problem-list">
                  <li>
                    <strong>Cobertura superior</strong>
                    <span>Sensor frontal VL53L0X direcionado à linha do olhar para placas, galhos e extintores.</span>
                  </li>
                  <li>
                    <strong>Sem bloqueio auditivo</strong>
                    <span>Alerta discreto por micro motor de vibração, mantendo o canal auditivo livre no trajeto.</span>
                  </li>
                  <li>
                    <strong>Sem substituir a bengala</strong>
                    <span>Proteção complementar focada em riscos suspensos, com atuação autônoma no hardware.</span>
                  </li>
                </ul>
              </div>

              <figure className="lp-diagram-frame">
                <img
                  src="/images/cobertura-complementar.svg"
                  alt="Diagrama de cobertura complementar do GuiaCampus: pessoa com bengala branca explorando o piso e sensor frontal nos óculos detectando um obstáculo na altura do rosto a até 50 cm."
                  width={1408}
                  height={1054}
                  className="lp-diagram-img"
                />
              </figure>
            </div>
          </div>
        </section>

        <section className="lp-section" id="arquitetura" aria-labelledby="arquitetura-heading">
          <div className="lp-arch-head">
            <h2 id="arquitetura-heading">Arquitetura real do protótipo</h2>
            <p>
              Do sensor ao navegador, o MVP opera sem nuvem ou servidor externo, refletindo o firmware e o contrato BLE
              do projeto.
            </p>
          </div>

          <div className="lp-arch-bands">
            <article className="lp-arch-row">
              <div className="lp-arch-label">
                <h3>Hardware: percepção e atuação local</h3>
              </div>
              <div className="lp-arch-detail">
                <p>
                  Um barramento I2C a 100 kHz interliga o laser VL53L0X (LONG_RANGE) e a IMU MPU6500 ao ESP32-C3
                  SuperMini. O motor coin 1027 atua via transistor no GPIO 3.
                </p>
                <div className="lp-spec-strip">
                  <span className="lp-spec-pill">VL53L0X · I2C 0x29</span>
                  <span className="lp-spec-pill">MPU6500 · I2C 0x68</span>
                  <span className="lp-spec-pill">SDA GPIO 7 / SCL GPIO 6</span>
                  <span className="lp-spec-pill">Motor GPIO 3 · PWM 160/255</span>
                </div>
              </div>
            </article>

            <article className="lp-arch-row">
              <div className="lp-arch-label">
                <h3>Firmware: decisão autônoma local</h3>
              </div>
              <div className="lp-arch-detail">
                <p>
                  O acionamento do motor ocorre no microcontrolador antes do rádio BLE e não depende de conexão com a
                  web. Com distância válida até 500 mm, o motor vibra; em leitura inválida, ele desliga e a central
                  indica risco desconhecido.
                </p>
                <div className="lp-spec-strip">
                  <span className="lp-spec-pill">Limiar inclusivo &lt;= 500 mm</span>
                  <span className="lp-spec-pill">Intervalo ~200 ms + leitura</span>
                  <span className="lp-spec-pill">Calibração IMU via serial (RAM)</span>
                </div>
              </div>
            </article>

            <article className="lp-arch-row">
              <div className="lp-arch-label">
                <h3>Telemetria BLE: pacote binário no Chrome</h3>
              </div>
              <div className="lp-arch-detail">
                <p>
                  Anunciando como GuiaCampus-01, o dispositivo notifica 20 bytes em little-endian via Web Bluetooth
                  somente leitura no Chrome (desktop ou Android em HTTPS ou localhost).
                </p>
                <div className="lp-packet-strip" role="list" aria-label="Estrutura dos 20 bytes do pacote BLE">
                  {PACKET_FIELDS.map(field => (
                    <div key={field.label} className="lp-packet-byte" role="listitem">
                      <span>{field.label}</span>
                      <strong>{field.name}</strong>
                      <small>{field.detail}</small>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="lp-dark-band lp-dark-surface" id="central" aria-labelledby="central-heading">
          <div className="lp-dark-inner">
            <div>
              <h2 id="central-heading">Central web acessível de monitoramento e demonstração</h2>
              <p>
                Desenvolvida em Next.js com foco em acessibilidade WCAG 2.1 AA, a central traduz os 20 bytes recebidos em
                estado claro de conexão, alerta de obstáculo e status do motor háptico — com modo Demonstração completo
                para apresentações sem o protótipo físico.
              </p>

              <ul className="lp-dark-list">
                <li>
                  <Check size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>Anúncios aria-live calibrados em transições críticas, sem saturar leitores de tela.</span>
                </li>
                <li>
                  <Check size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>Leitura inválida nunca vira zero nem caminho livre: exibe risco desconhecido com clareza.</span>
                </li>
                <li>
                  <Check size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>Diagnóstico IMU recolhível (gráficos e pitch/roll), registro de eventos e exportação CSV.</span>
                </li>
              </ul>

              <Link className="lp-cta-signal" href="/monitor">
                Abrir central de monitoramento
                <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </div>

            <aside className="lp-scope-box" aria-label="Escopo do MVP atual e visão futura">
              <img
                src="/logos/guiacampus-horizontal-assinatura-negativo.svg"
                alt="GuiaCampus — Navegação assistida e IoT"
                width={182}
                height={45}
                className="lp-scope-logo"
              />
              <div className="lp-scope-divider" />
              <div className="lp-scope-block">
                <h3>Escopo entregue neste MVP BLE</h3>
                <p>
                  Monitoramento em tempo real via Web Bluetooth (1x VL53L0X, 1x MPU6500 e 1x Coin Motor 1027), modo
                  Demonstração com cenários de teste, histórico de sessão em memória e exportação CSV.
                </p>
              </div>
              <div className="lp-scope-divider" />
              <div className="lp-scope-block">
                <h3>Visão futura para instituições</h3>
                <p>
                  Em etapas posteriores fora deste MVP, o projeto prevê georreferenciamento de obstáculos em mapa
                  interativo do campus para apoiar instituições e equipes de manutenção na remoção de barreiras físicas.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="lp-band-white" id="equipe" aria-labelledby="equipe-heading">
          <div className="lp-section">
            <h2 id="equipe-heading">Equipe e orientação acadêmica</h2>
            <p className="lp-prose">
              Projeto desenvolvido na disciplina Trabalho Interdisciplinar V (TI5 — Ciência da Computação), integrando
              hardware embarcado, sistemas operacionais, comunicação BLE e acessibilidade na web.
            </p>

            <div className="lp-team-grid">
              <div className="lp-team-col">
                <h3>Alunos integrantes</h3>
                <ul>
                  {TEAM_STUDENTS.map(name => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>

              <div className="lp-team-col">
                <h3>Professores responsáveis</h3>
                <ul>
                  {TEAM_ADVISORS.map(name => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span className="lp-footer-safety">
            <img
              src="/logos/guiacampus-simbolo.svg"
              alt=""
              aria-hidden="true"
              width={34}
              height={33}
              className="lp-footer-symbol"
            />
            <span>Alertas físicos operam localmente nos óculos; a central web apenas monitora.</span>
          </span>
          <div className="lp-footer-links">
            <a href="#modelo-3d">Modelo 3D</a>
            <a href="#arquitetura">Arquitetura</a>
            <Link href="/monitor">Central BLE (/monitor)</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
