// src/types/index.ts
export interface FileItem {
  type: "file" | "directory";
  name: string;
  size: number;
  modifiedDate: string;
}

export interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}
