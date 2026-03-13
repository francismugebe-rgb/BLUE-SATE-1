import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import datingReducer from './slices/datingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    dating: datingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
