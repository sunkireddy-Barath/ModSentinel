import { useCallback, useEffect, useRef } from 'react';
import type { WebViewToDevvit, DevvitToWebView } from '../types';

type MessageHandler = (msg: DevvitToWebView) => void;

export function useDevvit(onMessage: MessageHandler) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const listener = (event: MessageEvent<DevvitToWebView>) => {
      const data = event.data;
      if (data && typeof data === 'object' && 'type' in data) {
        handlerRef.current(data);
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
