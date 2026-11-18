import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VendorLens | Third-Party Risk Intelligence',
  description: 'Evidence-backed third-party cybersecurity posture tracking and risk intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-black" style={{ colorScheme: 'dark' }}>
      <body className={`${inter.className} min-h-screen bg-black text-foreground antialiased selection:bg-foreground selection:text-black enterprise-grid`}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" disableTransitionOnChange>
          <div className="flex min-h-screen bg-black">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 lg:pl-64 bg-black">
              <Header />
              <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full bg-black">
                {children}
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
