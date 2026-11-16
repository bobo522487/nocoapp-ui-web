import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './index.css';
import { maybeEnableMock } from './features/auth/enableMock';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 在挂载应用前确保本地 mock 后端完成注册（独立运行模式），避免首屏鉴权请求早于注册触发。
async function init() {
  await maybeEnableMock();
  const root = ReactDOM.createRoot(rootElement!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void init();