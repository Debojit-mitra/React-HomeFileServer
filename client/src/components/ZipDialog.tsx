import React, { useState, useEffect } from "react";
import { Loader2, Download } from "lucide-react";

interface ZipConfirmationDialogProps {
  isOpen: boolean;
  folderName: string;
  folderSize: string;
  zipExists?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDownloadExisting?: () => void;
}

interface ZipProgressDialogProps {
  isOpen: boolean;
  progress: number;
  status: string;
  onCancel: () => void;
}

const getEstimatedTime = (size: string): string => {
  if (size === "Calculating...") return "calculating...";

  const [value, unit] = size.split(" ");
  const numericValue = parseFloat(value);

  if (isNaN(numericValue)) return "calculating...";

  let sizeInGB = numericValue;
  switch (unit.toUpperCase()) {
    case "KB":
      sizeInGB = numericValue / (1024 * 1024);
      break;
    case "MB":
      sizeInGB = numericValue / 1024;
      break;
    case "TB":
      sizeInGB = numericValue * 1024;
      break;
  }

  if (sizeInGB >= 20) {
    return "It will take quite a while be patient and rest easy.";
  } else if (sizeInGB >= 5) {
    return "< 8 minutes (aprx)";
  } else if (sizeInGB >= 2) {
    return "< 2 minutes (aprx)";
  } else {
    return "< 1 minutes (aprx)";
  }
};

export const ZipConfirmationDialog: React.FC<ZipConfirmationDialogProps> = ({
  isOpen,
  folderName,
  folderSize,
  zipExists = false,
  onConfirm,
  onCancel,
  onDownloadExisting,
}) => {
  const [localFolderSize, setLocalFolderSize] = useState("Calculating...");
  const [estimatedTime, setEstimatedTime] = useState("calculating...");

  // Reset values when dialog opens or folder changes
  useEffect(() => {
    if (isOpen) {
      setLocalFolderSize("Calculating...");
      setEstimatedTime("calculating...");
    }
  }, [isOpen, folderName]);

  // Update values when folderSize changes
  useEffect(() => {
    if (folderSize !== "Calculating...") {
      setLocalFolderSize(folderSize);
      setEstimatedTime(getEstimatedTime(folderSize));
    }
  }, [folderSize]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-2 dark:text-white">
          {zipExists ? "Zip Archive Available" : "Create Zip Archive"}
        </h2>
        <div className="text-gray-600 dark:text-gray-300 space-y-2 mb-4">
          {zipExists ? (
            <>
              <p>A zip archive for "{folderName}" already exists!</p>
              <p className="text-green-600 dark:text-green-400">
                You can download the existing zip file or create a new one.
              </p>
            </>
          ) : (
            <>
              <p>Do you want to create a zip archive for "{folderName}"?</p>
              <div className="flex items-center gap-2">
                <p>Folder size: {localFolderSize}</p>
                {localFolderSize === "Calculating..." && (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                )}
              </div>
              <p className="text-amber-600 dark:text-amber-400">
                Estimated time: {estimatedTime}
              </p>
            </>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          {zipExists ? (
            <>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Create New
              </button>
              <button
                onClick={onDownloadExisting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors inline-flex items-center gap-2"
              >
                <Download size={16} />
                Download Existing
              </button>
            </>
          ) : (
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Create Zip
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ZipProgressDialog: React.FC<ZipProgressDialogProps> = ({
  isOpen,
  status,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h2 className="text-lg font-semibold dark:text-white">
            Creating Zip Archive
          </h2>

          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />

          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300">
              {status === "preparing" && "Preparing files..."}
              {status === "processing" && "Creating zip archive..."}
              {status === "ready" && "Starting download..."}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Please keep this window open
            </p>
          </div>
        </div>
        {status !== "ready" && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
