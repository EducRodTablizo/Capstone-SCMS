import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const isClerkConfigured = (): boolean => {
  return Boolean(
    clerkPubKey &&
      (clerkPubKey.startsWith('pk_test_') || clerkPubKey.startsWith('pk_live_')) &&
      !clerkPubKey.includes('placeholder')
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isClerkConfigured() ? (
      <ClerkProvider publishableKey={clerkPubKey}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
