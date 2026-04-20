import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { TonConnectUIProvider, THEME } from '@tonconnect/ui-react';
import App from './App.tsx';
import './index.css';

// Используем прямой путь к манифесту на GitHub Pages
const manifestUrl = 'https://nezd-creator.github.io/MYgame2/tonconnect-manifest.json';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Стандартная настройка без прокси, так как мы на статике */}
    <TonConnectUIProvider manifestUrl={manifestUrl} uiPreferences={{ theme: THEME.DARK }} actionsConfiguration={{ twaReturnUrl: 'https://t.me/your_bot_name' }}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
);
