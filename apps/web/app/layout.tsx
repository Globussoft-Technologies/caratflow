import { Providers } from '@/providers/providers';
import './globals.css';

export const metadata = {
  title: 'CaratFlow - Jewelry ERP',
  description: 'Complete jewelry business management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
