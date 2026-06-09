import axios from 'axios';

// The adb reverse command seamlessly maps this to the host machine's port 3001
const API_BASE_URL = 'http://localhost:3001/api';

let authToken: string | null = null;

export const setClientAuthToken = (token: string | null) => {
  authToken = token;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach bearer token to all outgoing requests if present
apiClient.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: Add response interceptors for global error handling here
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[HTTP Bridge Error]', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);
