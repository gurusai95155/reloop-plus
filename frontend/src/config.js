/**
 * Frontend Configuration
 * In local development, defaults to '/api' (proxied by Vite to http://localhost:3001).
 * In production deployment, can be configured via VITE_API_URL (e.g., https://reloop-api.onrender.com/api).
 */
export const API = import.meta.env.VITE_API_URL || '/api';
