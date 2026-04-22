import axios, { type AxiosInstance } from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const httpClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[httpClient] 401 — backend auth failed');
    }
    return Promise.reject(error);
  },
);