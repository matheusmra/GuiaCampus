import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: 'GuiaCampus — Óculos IoT para navegação assistida',
  description:
    'Protótipo vestível para detecção de obstáculos na altura da cabeça com sensor laser VL53L0X, alerta tátil autônomo e central web acessível via Bluetooth LE.',
};

export default function Home() {
  return <LandingPage />;
}
