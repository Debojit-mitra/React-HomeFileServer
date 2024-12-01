import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getStreamUrl, getFileDownloadUrl } from "../services/api";
import { Download } from "lucide-react";
import { Layout } from "./shared/Layout";
import { useTheme } from "../contexts/ThemeContext";

export const VideoPlayer: React.FC = () => {
  const { "*": filePath } = useParams();
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const fileName = filePath?.split("/").pop() || "";
  const isDark = theme === "dark";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = () => {
      const videoElement = video;
      console.error("Video Error:", {
        error: videoElement.error,
        networkState: videoElement.networkState,
        readyState: videoElement.readyState,
        currentSrc: videoElement.currentSrc,
      });
      setError("Failed to play video. Try downloading instead.");
    };

    const handleCanPlay = () => {
      console.log("Video can play");
      setError(null);
    };

    video.load();
    setError(null);

    video.addEventListener("error", handleError);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("error", handleError);
      video.removeEventListener("canplay", handleCanPlay);
    };
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

        {/* Video Player */}
        <div
          className={`w-full rounded-lg overflow-hidden shadow-lg ${
            isDark ? "bg-dark-surface" : "bg-white"
          }`}
        >
          <div className="relative w-full h-0 pb-[56.25%]">
            <div className={`absolute inset-0 ${error ? "opacity-0" : ""}`}>
              <video
                ref={videoRef}
                controls
                playsInline
                className="w-full h-full object-contain"
                preload="auto"
              >
                <source src={getStreamUrl(filePath || "")} type="video/mp4" />
              </video>
            </div>
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white">
                <div className="text-center p-6">
                  <p className="mb-4">{error}</p>
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 mx-auto"
                  >
                    <Download size={20} />
                    <span>Download Video</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* File Info */}
        <div
          className={`rounded-lg p-4 ${
            isDark ? "bg-dark-surface" : "bg-white"
          }`}
        >
          <p
            className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
          >
            Path: {filePath}
          </p>
        </div>
      </div>
    </Layout>
  );
};
