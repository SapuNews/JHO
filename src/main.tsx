import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safety trap for benign browser WebSocket / media stream abort rejections
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const msg = typeof reason === "string" ? reason : reason?.message || "";
    if (
      msg.includes("WebSocket") ||
      msg.includes("closed without opened") ||
      msg.includes("AbortError") ||
      msg.includes("play() request was interrupted")
    ) {
      event.preventDefault();
      console.warn("Benign rejection suppressed:", msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

