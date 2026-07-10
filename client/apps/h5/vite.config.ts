import react from '@vitejs/plugin-react';
import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    AutoImport({
      dts: path.resolve(__dirname, 'src/types/auto-imports.d.ts'),
      dirs: [
        'src/components/**',
      ],
      imports: [
        'react',
        {
          '@h5/App': ['App'],
          '@tanstack/react-query': ['QueryClient', 'QueryClientProvider'],
          '@unknown/api-client': [
            'clearStoredClientAuthSession',
            'getStoredClientAuthSession',
            'setStoredClientAuthSession',
          ],
          '@unknown/domain': [
            'accountStatusLabels',
            'clientPrimaryTabs',
            'clientPublishPlatformLabels',
            'deliveryModeLabels',
            'getDefaultPrimaryTab',
            'mineEntryLabels',
            'paymentMethodLabels',
            'roleLabels',
          ],
          '@unknown/hooks': [
            'useClientHome',
            'useClientLogin',
            'useClientRegister',
            'useClientWorkspace',
            'useProducts',
            'usePurchaseProduct',
          ],
          'lucide-react': [
            'AlertCircle',
            'ArrowLeft',
            'BadgeCheck',
            'BriefcaseBusiness',
            'CalendarClock',
            'CheckCircle2',
            'ChevronRight',
            'CircleDollarSign',
            'ClipboardCheck',
            'Crosshair',
            'GraduationCap',
            'Heart',
            'Home',
            'KeyRound',
            'LogOut',
            'Megaphone',
            'MessageCircle',
            'PackageCheck',
            'Plus',
            'Settings',
            'ShieldCheck',
            'ShoppingBag',
            'Smartphone',
            'Store',
            'Truck',
            'UserRound',
            'WalletCards',
            'XCircle',
          ],
          react: ['StrictMode'],
          'react-dom/client': ['createRoot'],
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@h5': path.resolve(__dirname, 'src'),
      '@unknown/api-client': path.resolve(
        __dirname,
        '../../packages/api-client/src',
      ),
      '@unknown/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@unknown/hooks': path.resolve(__dirname, '../../packages/hooks/src'),
      '@unknown/ui-tokens': path.resolve(
        __dirname,
        '../../packages/ui-tokens/src',
      ),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
  },
  preview: {
    port: 4174,
  },
});
