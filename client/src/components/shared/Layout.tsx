// src/components/shared/Layout.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, List, Moon, Sun, LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

interface LayoutProps {
  children: React.ReactNode;
  showViewControls?: boolean;
  breadcrumb?:
    | {
        currentPath: string;
        pathSegments: string[];
      }
    | string; // Allow either full breadcrumb object or simple string title
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showViewControls = false,
  breadcrumb,
}) => {
  const { theme, toggleTheme, viewMode, setViewMode } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const renderBreadcrumb = () => {
    if (!breadcrumb) return null;

    if (typeof breadcrumb === "string") {
      return (
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
          <button
            onClick={() => navigate("/files")}
            className="hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Home
          </button>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{breadcrumb}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
        <button
          onClick={() => navigate("/files")}
          className="hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Home
        </button>
        {breadcrumb.pathSegments.map((segment, index) => (
          <React.Fragment key={segment}>
            <span>/</span>
            <button
              onClick={() =>
                navigate(
                  `/files/${breadcrumb.pathSegments
                    .slice(0, index + 1)
                    .map((s) => encodeURIComponent(s))
                    .join("/")}`
                )
              }
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {segment}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-dark-surface shadow dark:shadow-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Zero Two's Server
              </h1>
              <div className="flex items-center space-x-2">
                {showViewControls && (
                  <>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded transition-colors ${
                        viewMode === "grid"
                          ? "bg-gray-200 dark:bg-gray-700"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <LayoutGrid size={20} className="dark:text-gray-300" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded transition-colors ${
                        viewMode === "list"
                          ? "bg-gray-200 dark:bg-gray-700"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <List size={20} className="dark:text-gray-300" />
                    </button>
                  </>
                )}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={`Switch to ${
                    theme === "light" ? "dark" : "light"
                  } mode`}
                >
                  {theme === "light" ? (
                    <Moon size={20} className="text-gray-600" />
                  ) : (
                    <Sun size={20} className="text-gray-300" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center space-x-2 px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {renderBreadcrumb()}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
};
