import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DatingState {
  potentialMatches: any[];
  matches: any[];
  loading: boolean;
}

const initialState: DatingState = {
  potentialMatches: [],
  matches: [],
  loading: false,
};

const datingSlice = createSlice({
  name: 'dating',
  initialState,
  reducers: {
    setPotentialMatches: (state, action: PayloadAction<any[]>) => {
      state.potentialMatches = action.payload;
    },
    setMatches: (state, action: PayloadAction<any[]>) => {
      state.matches = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setPotentialMatches, setMatches, setLoading } = datingSlice.actions;
export default datingSlice.reducer;
