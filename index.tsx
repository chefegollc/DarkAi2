import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const mountApp = () => {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    // This error should ideally never be thrown with the readyState check, but it's good practice.
    throw new Error("Fatal Error: The root element with ID 'root' was not found in the HTML. The application cannot be mounted.");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Check if the DOM is already interactive/complete.
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  mountApp();
} else {
  // Otherwise, wait for the DOMContentLoaded event.
  document.addEventListener('DOMContentLoaded', mountApp, { once: true });
}