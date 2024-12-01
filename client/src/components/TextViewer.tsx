import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getFileDownloadUrl } from "../services/api";
import { Download } from "lucide-react";
import { Layout } from "./shared/Layout";
import { useTheme } from "../contexts/ThemeContext";

export const TextViewer: React.FC = () => {
  const { "*": filePath } = useParams();
  const { theme } = useTheme();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileName = filePath?.split("/").pop() || "";
  const isDark = theme === "dark";

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await fetch(getFileDownloadUrl(filePath || ""));
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError("Failed to load file content");
        console.error("Error loading file:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [filePath]);

  const handleDownload = () => {
    window.open(getFileDownloadUrl(filePath || ""));
  };

  return (
    <Layout breadcrumb={fileName}>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex justify-end">
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download size={20} />
            <span>Download</span>
          </button>
        </div>

        {/* Text Content */}
        <div
          className={`rounded-lg shadow-lg overflow-hidden ${
            isDark ? "bg-dark-surface" : "bg-white"
          }`}
        >
          {loading ? (
            <div className="flex justify-center items-center h-[calc(100vh-16rem)]">
              <div
                className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                  isDark ? "border-blue-400" : "border-blue-500"
                }`}
              ></div>
            </div>
          ) : error ? (
            <div className="p-6 text-red-500">{error}</div>
          ) : (
            <div className="w-full h-[calc(100vh-16rem)] overflow-auto">
              <pre
                className={`p-6 font-mono text-sm whitespace-pre-wrap ${
                  isDark ? "text-gray-200" : "text-gray-800"
                }`}
              >
                {content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
