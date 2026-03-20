import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

console.log('Frontend main.tsx is executing...');
const errorDisplay = document.getElementById('error-display');
if (errorDisplay) errorDisplay.innerText = 'JS is executing...';

try {
  console.log('Attempting to create root...');
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  const root = ReactDOM.createRoot(rootElement);
  console.log('Root created, rendering App...');
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('App render called.');
} catch (error) {
  console.error('Failed to mount React app:', error);
  if (errorDisplay) {
    errorDisplay.innerText = 'Mount Error: ' + (error instanceof Error ? error.message : String(error));
  }
}
