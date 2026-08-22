import axios, { type AxiosInstance } from 'axios'
import { getRuntimeApiKey } from './runtimeAuth'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export const httpClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const apiKey = getRuntimeApiKey()
  if (apiKey) config.headers.set('X-API-Key', apiKey)
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) console.warn('[httpClient] 401 — backend auth failed')
    return Promise.reject(error)
  },
)
