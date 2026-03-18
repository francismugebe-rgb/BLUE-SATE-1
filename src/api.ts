const API_URL = ""; // Relative to the server

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API Request failed");
  }

  return response.json();
}

export const authApi = {
  login: (credentials: any) => apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  register: (data: any) => apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => apiFetch("/api/auth/me"),
};

export const socialApi = {
  getPosts: () => apiFetch("/api/posts"),
  getUserProfile: (uid: string) => apiFetch(`/api/users/${uid}`),
  createPost: (data: any) => apiFetch("/api/posts", { method: "POST", body: JSON.stringify(data) }),
  likePost: (postId: string, emoji: string) => apiFetch(`/api/posts/${postId}/like`, { method: "POST", body: JSON.stringify({ emoji }) }),
  commentPost: (postId: string, text: string) => apiFetch(`/api/posts/${postId}/comment`, { method: "POST", body: JSON.stringify({ text }) }),
  followUser: (targetUserId: string) => apiFetch(`/api/users/${targetUserId}/follow`, { method: "POST" }),
  report: (data: any) => apiFetch("/api/reports", { method: "POST", body: JSON.stringify(data) }),
  updateProfile: (data: any) => apiFetch("/api/auth/me", { method: "PUT", body: JSON.stringify(data) }),
  sendMessage: (data: any) => apiFetch("/api/messages", { method: "POST", body: JSON.stringify(data) }),
  getChats: () => apiFetch("/api/chats"),
  getMessages: (chatId: string) => apiFetch(`/api/messages/${chatId}`),
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error("Upload failed");
    return response.json();
  },
};
