import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { TonConnectUIProvider, THEME } from '@tonconnect/ui-react';
import App from './App.tsx';
import './index.css';

// Используем локальный путь к манифесту
const manifestUrl = 'https://project-acn7o.vercel.app/tonconnect-manifest.json';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl} uiPreferences={{ theme: THEME.DARK }} actionsConfiguration={{ twaReturnUrl: 'https://t.me/your_bot_username' }}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
);
