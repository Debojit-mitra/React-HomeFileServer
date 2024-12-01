// src/App.tsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  ScrollRestoration,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Login } from "./components/Login";
import {
  FileExplorer,
  VideoPlayer,
  ImageViewer,
  TextViewer,
} from "./components";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/files/*"
              element={
                <ProtectedRoute>
                  <FileExplorer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/player/*"
              element={
                <ProtectedRoute>
                  <VideoPlayer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/image/*"
              element={
                <ProtectedRoute>
                  <ImageViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/text/*"
              element={
                <ProtectedRoute>
                  <TextViewer />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/files" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
