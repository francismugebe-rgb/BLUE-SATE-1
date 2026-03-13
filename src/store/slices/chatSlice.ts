import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatState {
  activeMatch: any | null;
  messages: any[];
  unreadCount: number;
}

const initialState: ChatState = {
  activeMatch: null,
  messages: [],
  unreadCount: 0,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveMatch: (state, action: PayloadAction<any>) => {
      state.activeMatch = action.payload;
    },
    setMessages: (state, action: PayloadAction<any[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<any>) => {
      state.messages.push(action.payload);
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
  },
});

export const { setActiveMatch, setMessages, addMessage, setUnreadCount } = chatSlice.actions;
export default chatSlice.reducer;
