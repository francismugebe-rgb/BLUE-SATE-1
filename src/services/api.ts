import { auth } from '../firebase';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = {
  async get(endpoint: string) {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  }
};
