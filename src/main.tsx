import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App.tsx';
import './index.css';

// Жестко задаем URL приложения, чтобы Mini App всегда стучался по правильному адресу нашего сервера
const manifestUrl = 'https://ais-dev-i23mijz2ljza6sfpg72euo-783580602421.europe-west2.run.app/tonconnect-manifest.json';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl} actionsConfiguration={{ twaReturnUrl: 'https://t.me/your_bot_name' }}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
);
