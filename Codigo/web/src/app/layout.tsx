import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'GuiaCampus — Monitoramento inteligente', description: 'Telemetria e diagnóstico do protótipo de navegação assistida GuiaCampus.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
