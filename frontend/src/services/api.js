import axios from "axios";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const pageHost = window.location.hostname;
const configuredApiUrl = import.meta.env.VITE_API_URL;
const configuredApiHost = configuredApiUrl
  ? new URL(configuredApiUrl, window.location.origin).hostname
  : null;
const apiBaseUrl = configuredApiUrl && (loopbackHosts.has(pageHost) || !loopbackHosts.has(configuredApiHost))
  ? configuredApiUrl
  : `${window.location.protocol}//${pageHost}:4000/api`;

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wms-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.endsWith("/auth/login")) {
      localStorage.removeItem("wms-token");
      window.dispatchEvent(new Event("wms:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "ไม่สามารถเชื่อมต่อระบบได้";
