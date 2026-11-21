import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GuiaCampus — Central de monitoramento',
  description: 'Central acessível de telemetria e monitoramento do protótipo de óculos assistivos GuiaCampus via Bluetooth LE.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={fontSans.variable}>
      <body>{children}</body>
    </html>
  );
}
