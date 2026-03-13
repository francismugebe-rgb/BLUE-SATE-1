import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './AuthProvider';
import App from './App';

const Root: React.FC = () => {
  return (
    <Provider store={store}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Provider>
  );
};

export default Root;
