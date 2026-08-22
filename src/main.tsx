import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Safety trap for benign browser WebSocket / media stream abort rejections
if (typeof window !== "undefined") {
  const isBenignError = (msg: string) => {
    const lower = (msg || "").toLowerCase();
    return (
      lower.includes("websocket") ||
      lower.includes("closed without opened") ||
      lower.includes("aborterror") ||
      lower.includes("interrupted") ||
      lower.includes("the operation was aborted") ||
      lower.includes("connection closed before")
    );
  };

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      try {
        const reason = event?.reason;
        const msg =
          typeof reason === "string"
            ? reason
            : reason?.message || reason?.name || String(reason || "");
        if (isBenignError(msg)) {
          event.preventDefault();
          if (typeof event.stopImmediatePropagation === "function") {
            event.stopImmediatePropagation();
          }
          console.warn("Benign rejection suppressed:", msg);
        }
      } catch (e) {}
    },
    true
  );

  window.addEventListener(
    "error",
    (event) => {
      try {
        const msg = event?.message || event?.error?.message || String(event || "");
        if (isBenignError(msg)) {
          event.preventDefault();
          if (typeof event.stopImmediatePropagation === "function") {
            event.stopImmediatePropagation();
          }
          console.warn("Benign window error suppressed:", msg);
        }
      } catch (e) {}
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

