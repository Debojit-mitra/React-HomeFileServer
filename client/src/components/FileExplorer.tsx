import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileItem } from "../types";
import {
  api,
  listFiles,
  getFileDownloadUrl,
  createFolderZip,
  getZipStatus,
  getZipDownloadUrl,
} from "../services/api";
import {
  FileText,
  Folder,
  Film,
  Image,
  Music,
  FileArchive,
  FileCode,
  Download,
} from "lucide-react";
import { Layout } from "../components/shared/Layout";
import { useTheme } from "../contexts/ThemeContext";
import { ZipConfirmationDialog, ZipProgressDialog } from "./ZipDialog";

// Add these types to your existing types or new file
interface FolderSize {
  isCalculating: boolean;
  size?: number;
  formattedSize?: string;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (!ext) return <FileText size={24} />;

  switch (ext) {
    case "mp4":
    case "avi":
    case "mkv":
    case "webm":
      return <Film size={24} className="text-purple-500" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return <Image size={24} className="text-blue-500" />;
    case "mp3":
    case "wav":
    case "ogg":
      return <Music size={24} className="text-green-500" />;
    case "zip":
    case "rar":
    case "7z":
      return <FileArchive size={24} className="text-amber-500" />;
    case "pdf":
      return <FileText size={24} className="text-red-500" />;
    case "js":
    case "ts":
    case "jsx":
    case "tsx":
    case "html":
    case "css":
      return <FileCode size={24} className="text-emerald-500" />;
    default:
      return <FileText size={24} className="text-gray-500" />;
  }
};

export const FileExplorer: React.FC = () => {
  const { viewMode } = useTheme();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "size" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = decodeURIComponent(
    location.pathname.replace("/files", "").replace(/^\/+/, "")
  );
  const pathSegments = currentPath
    ? currentPath.split("/").map((segment) => decodeURIComponent(segment))
    : [];

  useEffect(() => {
    loadFiles();
  }, [currentPath, sortBy, sortOrder]);

  const [downloadProgress, setDownloadProgress] = useState<{
    zipId?: string;
    progress: number;
    status: string;
  } | null>(null);

  const [showZipConfirm, setShowZipConfirm] = useState(false);
  const [existingZip, setExistingZip] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FileItem | null>(null);
  const [folderSize, setFolderSize] = useState<FolderSize>({
    isCalculating: false,
  });
  const [showZipProgress, setShowZipProgress] = useState(false);
  const [zipProgress, setZipProgress] = useState({
    progress: 0,
    status: "preparing",
  });

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await listFiles(currentPath);

      // Sort files
      const sortedFiles = [...data].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }

        switch (sortBy) {
          case "name":
            return sortOrder === "asc"
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name);
          case "size":
            return sortOrder === "asc" ? a.size - b.size : b.size - a.size;
          case "date":
            return sortOrder === "asc"
              ? new Date(a.modifiedDate).getTime() -
                  new Date(b.modifiedDate).getTime()
              : new Date(b.modifiedDate).getTime() -
                  new Date(a.modifiedDate).getTime();
          default:
            return 0;
        }
      });

      setFiles(sortedFiles);
      setError("");
    } catch (err) {
      setError("Failed to load files");
      console.error("Error loading files:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === "directory") {
      const newPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      navigate(`/files/${newPath}`);
    } else {
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;

      if (fileExt) {
        // Video files
        if (["mp4", "webm", "ogg", "mkv", "avi"].includes(fileExt)) {
          navigate(`/player/${filePath}`);
          return;
        }

        // Image files
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt)) {
          navigate(`/image/${filePath}`);
          return;
        }

        // Text/Code files
        if (
          [
            "txt",
            "js",
            "ts",
            "jsx",
            "tsx",
            "html",
            "css",
            "json",
            "md",
          ].includes(fileExt)
        ) {
          navigate(`/text/${filePath}`);
          return;
        }

        // Open PDFs in new tab
        if (fileExt === "pdf") {
          window.open(getFileDownloadUrl(filePath), "_blank");
          return;
        }
      }

      // Default to download for other file types
      window.open(getFileDownloadUrl(filePath));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Add these functions before your render
  const calculateFolderSize = async (folder: FileItem) => {
    try {
      const folderPath = currentPath
        ? `${currentPath}/${folder.name}`
        : folder.name;
      const response = await api.get(
        `/folder-size/${encodeURIComponent(folderPath)}`
      );
      const size = response.data.size;
      return {
        isCalculating: false,
        size,
        formattedSize: formatSize(size),
      };
    } catch (error) {
      console.error("Error calculating folder size:", error);
      return {
        isCalculating: false,
        size: 0,
        formattedSize: "Size calculation failed",
      };
    }
  };

  const handleFolderDownload = async (
    e: React.MouseEvent,
    folder: FileItem
  ) => {
    e.stopPropagation();
    setSelectedFolder(folder);
    setFolderSize({ isCalculating: true });
    setShowZipConfirm(true); // Show dialog first

    // Check for existing zip
    const folderPath = currentPath
      ? `${currentPath}/${folder.name}`
      : folder.name;

    try {
      // Check for existing zip first
      const existsResponse = await api.get(
        `/zip/${encodeURIComponent(folderPath)}/exists`
      );
      setExistingZip(existsResponse.data.exists);

      // Then calculate size
      const sizeInfo = await calculateFolderSize(folder);
      setFolderSize(sizeInfo);
    } catch (error) {
      console.error("Error in handleFolderDownload:", error);
      setExistingZip(false);
      setFolderSize({
        isCalculating: false,
        formattedSize: "Error calculating size",
      });
    }
  };

  // Update handleZipConfirm to handle new zip creation
  const handleZipConfirm = async () => {
    if (!selectedFolder) return;

    try {
      const folderPath = currentPath
        ? `${currentPath}/${selectedFolder.name}`
        : selectedFolder.name;

      setShowZipConfirm(false);
      setShowZipProgress(true);
      setZipProgress({ progress: 0, status: "preparing" });

      // Pass forceNew: true to create a new ZIP
      const { zipId } = await createFolderZip(folderPath, true);

      let cancelled = false;
      const checkStatus = async () => {
        if (cancelled) return;

        try {
          const status = await getZipStatus(zipId);

          if (status.status === "cancelled") {
            setShowZipProgress(false);
            setZipProgress({ progress: 0, status: "preparing" });
            return;
          }

          setZipProgress(status);

          if (status.status === "ready") {
            window.location.href = getZipDownloadUrl(zipId);
            setTimeout(() => {
              setShowZipProgress(false);
              setZipProgress({ progress: 0, status: "preparing" });
            }, 1000);
          } else if (status.status === "error") {
            throw new Error(status.error);
          } else {
            setTimeout(checkStatus, 1000);
          }
        } catch (error) {
          console.error("Error checking zip status:", error);
          setError("Failed to check zip status");
          setShowZipProgress(false);
        }
      };

      checkStatus();

      return () => {
        cancelled = true;
      };
    } catch (error) {
      console.error("Error in handleZipConfirm:", error);
      setError("Failed to handle zip operation");
      setShowZipProgress(false);
    }
  };

  // Fix the handleDownloadExisting function
  const handleDownloadExisting = async () => {
    if (!selectedFolder) return;

    const folderPath = currentPath
      ? `${currentPath}/${selectedFolder.name}`
      : selectedFolder.name;

    const zipId = encodeURIComponent(folderPath);
    window.location.href = getZipDownloadUrl(zipId);
    setShowZipConfirm(false);
    setSelectedFolder(null);
    setExistingZip(false);
  };

  // Update handleZipCancel
  const handleZipCancel = () => {
    setShowZipConfirm(false);
    setSelectedFolder(null);
    setExistingZip(false);
    setFolderSize({ isCalculating: false });
  };

  const handleDownload = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
    window.open(getFileDownloadUrl(filePath));
  };

  {
    downloadProgress && (
      <div className="fixed bottom-4 right-4 bg-white dark:bg-dark-surface p-4 rounded-lg shadow-lg max-w-sm w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {downloadProgress.status === "preparing" && "Preparing download..."}
            {downloadProgress.status === "processing" && "Creating ZIP file..."}
            {downloadProgress.status === "ready" && "Starting download..."}
          </span>
          {downloadProgress.status !== "ready" && (
            <button
              onClick={() => setDownloadProgress(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress.progress}%` }}
          />
        </div>
      </div>
    );
  }

  const renderContent = () => (
    <>
      {/* Sort Controls */}
      <div className="mb-4 flex items-center space-x-4">
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as "name" | "size" | "date")
          }
          className="px-3 py-2 border rounded-md dark:bg-dark-surface dark:border-dark-border dark:text-white"
        >
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="date">Date Modified</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="px-3 py-2 border rounded-md hover:bg-gray-50 dark:border-dark-border dark:hover:bg-dark-surface dark:text-white transition-colors"
        >
          {sortOrder === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.name}
              onClick={() => handleFileClick(file)}
              className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm hover:shadow-md dark:shadow-gray-900 transition-shadow cursor-pointer relative group"
            >
              <div className="flex justify-center mb-4">
                {file.type === "directory" && (
                  <button
                    onClick={(e) => handleFolderDownload(e, file)}
                    className="absolute top-2 right-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Download folder as ZIP"
                  >
                    <Download
                      size={16}
                      className="text-gray-600 dark:text-gray-300"
                    />
                  </button>
                )}
              </div>
              <div className="text-center">
                <h3
                  className="text-sm font-medium text-gray-900 dark:text-white truncate"
                  title={file.name}
                >
                  {file.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {file.type === "file" ? formatSize(file.size) : ""}
                </p>
                {file.type === "file" && (
                  <button
                    onClick={(e) => handleDownload(e, file)}
                    className="absolute top-2 right-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Download file"
                  >
                    <Download
                      size={16}
                      className="text-gray-600 dark:text-gray-300"
                    />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-surface shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Modified
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-border">
              {files.map((file) => (
                <tr
                  key={file.name}
                  onClick={() => handleFileClick(file)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {file.type === "directory" ? (
                          <Folder size={24} className="text-blue-500" />
                        ) : (
                          getFileIcon(file.name)
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {file.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {file.type === "file" ? formatSize(file.size) : "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(file.modifiedDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {file.type === "file" ? (
                      <button
                        onClick={(e) => handleDownload(e, file)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="Download file"
                      >
                        <Download size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleFolderDownload(e, file)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="Download folder as ZIP"
                      >
                        <Download size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <Layout
      showViewControls={true}
      breadcrumb={{
        currentPath,
        pathSegments,
      }}
    >
      {renderContent()}
      <>
        <ZipConfirmationDialog
          isOpen={showZipConfirm}
          folderName={selectedFolder?.name || ""}
          folderSize={folderSize.formattedSize || "Calculating..."}
          zipExists={existingZip}
          onConfirm={handleZipConfirm}
          onCancel={handleZipCancel}
          onDownloadExisting={handleDownloadExisting}
        />
        <ZipProgressDialog
          isOpen={showZipProgress}
          progress={zipProgress.progress}
          status={zipProgress.status}
          onCancel={handleZipCancel}
        />
      </>
    </Layout>
  );
};
