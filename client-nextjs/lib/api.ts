const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const AUTH_SERVICE_URL = 'http://localhost:3001';
const MESSAGE_SERVICE_URL = 'http://localhost:3003';
const USER_SERVICE_URL = 'http://localhost:3002';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export const api = {
  async register(email: string, password: string) {
    try {
      console.log('🌐 POST /auth/register - Sending registration request');
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log('📨 Response status:', res.status);
      if (!res.ok) {
        const errorData = await res.text();
        console.error('❌ Registration failed:', errorData);
        throw new Error(`Registration failed: ${res.status}`);
      }
      const data = await res.json();
      console.log('✅ Registration successful');
      return data as AuthResponse;
    } catch (error) {
      console.error('❌ Registration API error:', error);
      throw error;
    }
  },

  async login(email: string, password: string) {
    try {
      console.log('🌐 POST /auth/login - Sending login request');
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log('📨 Response status:', res.status);
      if (!res.ok) {
        const errorData = await res.text();
        console.error('❌ Login failed:', errorData);
        throw new Error(`Login failed: ${res.status}`);
      }
      const data = await res.json();
      console.log('✅ Login successful');
      return data as AuthResponse;
    } catch (error) {
      console.error('❌ Login API error:', error);
      throw error;
    }
  },

  async getProfile(token: string) {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to get profile');
    return res.json() as Promise<User>;
  },

  async updateProfile(token: string, data: Partial<User>) {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json() as Promise<User>;
  },

  async getConversations(token: string) {
    const res = await fetch(`${API_BASE_URL}/messages/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to get conversations');
    return res.json();
  },

  async getMessages(token: string, conversationId: string) {
    const res = await fetch(
      `${API_BASE_URL}/messages/conversations/${conversationId}/messages`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error('Failed to get messages');
    return res.json();
  },

  async sendMessage(
    token: string,
    conversationId: string,
    content: string
  ) {
    const res = await fetch(
      `${API_BASE_URL}/messages/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      }
    );
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  async searchUsers(token: string, query: string) {
    const res = await fetch(`${API_BASE_URL}/users/search?q=${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to search users');
    return res.json();
  },
};
