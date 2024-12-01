import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { getFileDownloadUrl } from "../services/api";
import { Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Layout } from "./shared/Layout";
import { useTheme } from "../contexts/ThemeContext";

export const ImageViewer: React.FC = () => {
  const { "*": filePath } = useParams();
  const { theme } = useTheme();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const fileName = filePath?.split("/").pop() || "";
  const isDark = theme === "dark";

  const handleDownload = () => {
    window.open(getFileDownloadUrl(filePath || ""));
  };

  return (
    <Layout breadcrumb={fileName}>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
            className={`p-2 rounded transition-colors ${
              isDark
                ? "text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100"
            }`}
            title="Zoom out"
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.min(3, prev + 0.25))}
            className={`p-2 rounded transition-colors ${
              isDark
                ? "text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100"
            }`}
            title="Zoom in"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            className={`p-2 rounded transition-colors ${
              isDark
                ? "text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100"
            }`}
            title="Rotate"
          >
            <RotateCw size={20} />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download size={20} />
            <span>Download</span>
          </button>
        </div>

        {/* Image Viewer */}
        <div
          className={`w-full overflow-hidden rounded-lg shadow-lg ${
            isDark ? "bg-dark-surface" : "bg-white"
          }`}
        >
          <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
            <img
              src={getFileDownloadUrl(filePath || "")}
              alt={fileName}
              className="object-contain max-w-full max-h-[calc(100vh-16rem)]"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.2s ease-in-out",
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};
