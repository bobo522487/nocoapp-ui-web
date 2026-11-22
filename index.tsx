import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './index.css';
import { maybeEnableMock } from './features/auth/enableMock';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 从根源避免 React Flow 节点批量测量、面板伸缩或字体切换触发 ResizeObserver 帧内循环通知错误
if (typeof window !== 'undefined') {
  const NativeResizeObserver = window.ResizeObserver;
  const PATCHED_FLAG = '__yunpuSafeResizeObserver';

  if (
    typeof NativeResizeObserver === 'function' &&
    !(NativeResizeObserver as unknown as Record<string, unknown>)[PATCHED_FLAG]
  ) {
    class SafeResizeObserver extends NativeResizeObserver {
      static [PATCHED_FLAG] = true;
      private _onUnobserve: (target: Element) => void;
      private _onDisconnect: () => void;

      constructor(callback: ResizeObserverCallback) {
        const pending = new Map<Element, ResizeObserverEntry>();
        let rafId = 0;
        let selfRef: SafeResizeObserver | null = null;

        super((entries, observer) => {
          for (const entry of entries) {
            pending.set(entry.target, entry);
          }
          if (rafId === 0) {
            rafId = window.requestAnimationFrame(() => {
              rafId = 0;
              if (pending.size === 0) return;
              const batch = Array.from(pending.values()).filter(
                (entry) => entry.target.isConnected
              );
              pending.clear();
              if (batch.length > 0) {
                callback(batch, selfRef ?? observer);
              }
            });
          }
        });

        selfRef = this;
        this._onUnobserve = (target: Element) => {
          pending.delete(target);
        };
        this._onDisconnect = () => {
          if (rafId !== 0) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
          }
          pending.clear();
        };
      }

      unobserve(target: Element): void {
        this._onUnobserve(target);
        super.unobserve(target);
      }

      disconnect(): void {
        this._onDisconnect();
        super.disconnect();
      }
    }

    window.ResizeObserver =
      SafeResizeObserver as unknown as typeof ResizeObserver;
  }

  const isResizeObserverLoopError = (msg?: string) =>
    typeof msg === 'string' &&
    (msg.includes('ResizeObserver loop completed with undelivered notifications') ||
      msg.includes('ResizeObserver loop limit exceeded'));

  window.addEventListener(
    'error',
    (event) => {
      if (isResizeObserverLoopError(event.message)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
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