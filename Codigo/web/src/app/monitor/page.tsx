import type { Metadata } from 'next';
import { Dashboard } from '@/components/dashboard/dashboard';

export const metadata: Metadata = {
  title: 'GuiaCampus — Central de monitoramento BLE',
  description:
    'Monitoramento e diagnóstico em tempo real do protótipo de óculos assistivos GuiaCampus via Web Bluetooth ou modo Demonstração.',
};

export default function MonitorPage() {
  return <Dashboard />;
}
