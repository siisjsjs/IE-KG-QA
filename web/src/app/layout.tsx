import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClientOnly } from '@/components/ClientOnly';
import { AppShell } from '@/components/AppShell';
import { Providers } from '@/components/Providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'IE-KG-QA',
  description: '知识图谱问答系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientOnly>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </ClientOnly>
      </body>
    </html>
  );
}