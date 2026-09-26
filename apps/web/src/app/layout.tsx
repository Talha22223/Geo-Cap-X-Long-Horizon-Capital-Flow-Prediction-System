import './globals.css';
import { Providers } from './providers';
import { ErrorBoundary } from '../components/error-boundary';
import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GeoCap-X | Enterprise Capital Flow Prediction Platform',
  description: 'SaaS Platform for Long-Horizon Capital Flow Analytics, Explainable SHAP AI Models, and Geopolitical Risk Mapping.',
  metadataBase: new URL('https://geocapx.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'GeoCap-X | Enterprise Capital Flow Prediction',
    description: 'Long-horizon capital forecasting, explainable SHAP attributions, and macroeconomic anomaly triggers.',
    url: 'https://geocapx.com',
    siteName: 'GeoCap-X Analytics',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GeoCap-X | Enterprise Capital Flow Prediction',
    description: 'Long-horizon capital forecasting and explainable SHAP attributions.',
    site: '@geocapx',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased min-h-screen transition-colors duration-200">
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
