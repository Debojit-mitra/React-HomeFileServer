// api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const listFiles = async (path: string = "") => {
  const endpoint = path ? `/files/${path}` : "/files";
  const response = await api.get(endpoint);
  return response.data;
};

export const loginUser = async (username: string, password: string) => {
  const response = await api.post("/login", { username, password });
  return response.data;
};

export const getFileDownloadUrl = (path: string) => {
  const token = localStorage.getItem("token");
  return `${api.defaults.baseURL}/download/${path}?token=${token}`;
};

export const getStreamUrl = (path: string) => {
  const token = localStorage.getItem("token");
  return `${api.defaults.baseURL}/stream/${path}?token=${token}`;
};

export const createFolderZip = async (
  folderPath: string,
  forceNew: boolean = false
) => {
  try {
    console.log("Creating zip for path:", folderPath, "Force new:", forceNew); // Debug log
    const response = await api.post("/zip", { folderPath, forceNew });
    console.log("Server response:", response.data); // Debug log
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Server error:", error.response?.data); // Debug log
      throw new Error(error.response?.data?.error || "Failed to create zip");
    }
    throw error;
  }
};

export const getZipStatus = async (zipId: string) => {
  try {
    const response = await api.get(`/zip/${zipId}/status`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || "Failed to get zip status"
      );
    }
    throw error;
  }
};

export const getZipDownloadUrl = (zipId: string) => {
  const token = localStorage.getItem("token");
  return `${api.defaults.baseURL}/zip/${zipId}/download?token=${token}`;
};
