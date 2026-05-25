import { useCallback, useEffect, useRef } from 'react';
import type { WebViewToDevvit, DevvitToWebView } from '../types';

type MessageHandler = (msg: DevvitToWebView) => void;

export function useDevvit(onMessage: MessageHandler) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const raw = event.data as Record<string, unknown>;
      if (!raw || typeof raw !== 'object') return;

      let payload: unknown;

      if (raw.type === 'devvit-message') {
        // Real Devvit runtime: messages arrive wrapped as { type: 'devvit-message', data: { message: payload } }
        const inner = raw.data as Record<string, unknown> | undefined;
        payload = inner?.message;
      } else {
        // Devtest / standalone browser mode: message is sent directly
        payload = raw;
      }

      if (payload && typeof payload === 'object' && 'type' in payload) {
        handlerRef.current(payload as DevvitToWebView);
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  const send = useCallback((message: WebViewToDevvit) => {
    window.parent.postMessage(message, '*');
  }, []);

  return { send };
}
