const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs").promises;
const archiver = require("archiver");
const { mkdir, rm } = require("fs").promises;
const crypto = require("crypto");
const {
  createReadStream,
  createWriteStream,
  existsSync,
  statSync,
  promises: fsPromises,
} = require("fs");
const { stat } = require("fs").promises;
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const TEMP_DIR = path.join(__dirname, "temp");
const MAX_ZIP_SIZE = 20 * 1024 * 1024 * 1024; // 20GB
const ZIP_CLEANUP_DELAY = 3600000; // 1 hour in milliseconds
const activeZipProcesses = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Basic authentication middleware
const authenticateToken = (req, res, next) => {
  // Check for token in Authorization header or query parameter
  const authHeader = req.headers["authorization"];
  const queryToken = req.query.token;

  let token = null;

  if (authHeader) {
    token = authHeader.split(" ")[1];
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Login endpoint
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// List files in directory
app.get("/api/files", authenticateToken, async (req, res) => {
  try {
    const basePath = process.env.FILE_STORAGE_PATH;

    if (!basePath) {
      console.error("FILE_STORAGE_PATH not set in environment variables");
      return res.status(500).json({
        message: "Server configuration error: FILE_STORAGE_PATH not set",
      });
    }

    const files = await fs.readdir(basePath);
    const filePromises = files.map(async (file) => {
      const filePath = path.join(basePath, file);
      try {
        const fileStats = await fs.stat(filePath);
        return {
          type: fileStats.isDirectory() ? "directory" : "file",
          name: file,
          size: fileStats.size,
          modifiedDate: fileStats.mtime,
        };
      } catch (error) {
        console.error(`Error reading file stats for ${file}:`, error);
        return null;
      }
    });

    const fileList = (await Promise.all(filePromises)).filter(Boolean);
    res.json(fileList);
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).json({
      message: "Error reading directory",
      error: error.message,
    });
  }
});

// List files in subdirectory
app.get("/api/files/*", authenticateToken, async (req, res) => {
  try {
    const relativePath = req.params[0];
    const basePath = process.env.FILE_STORAGE_PATH;
    const fullPath = path.join(basePath, relativePath);

    // Ensure the requested path is within the base path
    const resolvedPath = path.resolve(fullPath);
    const resolvedBasePath = path.resolve(basePath);

    if (!resolvedPath.startsWith(resolvedBasePath)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const stats = await fs.stat(fullPath);

    if (stats.isFile()) {
      res.json({
        type: "file",
        name: path.basename(fullPath),
        size: stats.size,
        modifiedDate: stats.mtime,
      });
    } else {
      const files = await fs.readdir(fullPath);
      const filePromises = files.map(async (file) => {
        const filePath = path.join(fullPath, file);
        try {
          const fileStats = await fs.stat(filePath);
          return {
            type: fileStats.isDirectory() ? "directory" : "file",
            name: file,
            size: fileStats.size,
            modifiedDate: fileStats.mtime,
          };
        } catch (error) {
          console.error(`Error reading file stats for ${file}:`, error);
          return null;
        }
      });

      const fileList = (await Promise.all(filePromises)).filter(Boolean);
      res.json(fileList);
    }
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).json({
      message: "Error reading directory",
      error: error.message,
    });
  }
});

// Stream video files
// server.js - Update the stream endpoint
app.get("/api/stream/*", authenticateToken, async (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params[0]);
    const fullPath = path.join(process.env.FILE_STORAGE_PATH, relativePath);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const resolvedBasePath = path.resolve(process.env.FILE_STORAGE_PATH);

    if (!resolvedPath.startsWith(resolvedBasePath)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!existsSync(fullPath)) {
      return res.status(404).json({ message: "File not found" });
    }

    const stat = statSync(fullPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const videoExt = path.extname(fullPath).toLowerCase();
    const contentType =
      {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".ogg": "video/ogg",
        ".mkv": "video/x-matroska",
      }[videoExt] || "application/octet-stream";

    // Set common headers
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Range");

    if (range) {
      // Handle range request
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      if (start >= fileSize) {
        res.status(416).send("Requested range not satisfiable");
        return;
      }

      const file = createReadStream(fullPath, { start, end });
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", chunkSize);

      file.on("error", (error) => {
        console.error("Stream error:", error);
        if (!res.headersSent) {
          res.status(500).send("Error streaming file");
        }
        res.end();
      });

      file.pipe(res);
    } else {
      // Handle full file request
      res.setHeader("Content-Length", fileSize);
      const file = createReadStream(fullPath);

      file.on("error", (error) => {
        console.error("Stream error:", error);
        if (!res.headersSent) {
          res.status(500).send("Error streaming file");
        }
        res.end();
      });

      file.pipe(res);
    }
  } catch (error) {
    console.error("Streaming error:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
    res.end();
  }
});

// Download file
// Download file endpoint
app.get("/api/download/*", authenticateToken, (req, res) => {
  const relativePath = req.params[0];
  const fullPath = path.join(process.env.FILE_STORAGE_PATH, relativePath);

  // Security check
  const resolvedPath = path.resolve(fullPath);
  const resolvedBasePath = path.resolve(process.env.FILE_STORAGE_PATH);

  if (!resolvedPath.startsWith(resolvedBasePath)) {
    return res.status(403).json({ message: "Access denied" });
  }

  if (!existsSync(fullPath)) {
    return res.status(404).json({ message: "File not found" });
  }

  let headersSent = false;

  const file = createReadStream(fullPath);

  file.on("error", (err) => {
    console.error("Error streaming file:", err);
    if (!headersSent) {
      res.status(500).json({
        message: "Error downloading file",
        error: err.message,
      });
    }
  });

  // Set content disposition and start download
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${path.basename(fullPath)}"`
  );
  headersSent = true;

  file.pipe(res);

  // Handle client disconnection
  res.on("close", () => {
    file.destroy();
  });
});
// Add this function to create temp directory
async function ensureTempDir() {
  try {
    await fsPromises.mkdir(TEMP_DIR, { recursive: true });
    return true;
  } catch (error) {
    console.error("Error creating temp directory:", error);
    return false;
  }
}

// Add this function to calculate folder size
async function getFolderSize(dirPath) {
  let size = 0;
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      size += await getFolderSize(itemPath);
    } else {
      const stat = await fs.stat(itemPath);
      size += stat.size;
    }
  }

  return size;
}

// Add this helper function at the top with other functions
function getZipNameFromPath(folderPath) {
  const folderName = path.basename(folderPath);
  return `${folderName}.zip`;
}

// Add this function to check for existing zip
async function findExistingZip(folderPath) {
  try {
    const zipName = getZipNameFromPath(folderPath);
    const files = await fsPromises.readdir(TEMP_DIR);

    for (const file of files) {
      if (file === zipName) {
        const zipPath = path.join(TEMP_DIR, file);
        const stats = await fsPromises.stat(zipPath);
        // Return the zip details if it exists and is less than 1 hour old
        if (Date.now() - stats.mtime.getTime() < ZIP_CLEANUP_DELAY) {
          return {
            zipId: path.parse(file).name,
            path: zipPath,
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error finding existing zip:", error);
    return null;
  }
}

// Update the POST endpoint
// Find the ZIP endpoint in server.js and update the relevant section:

app.post("/api/zip", authenticateToken, async (req, res) => {
  try {
    const { folderPath, forceNew } = req.body;
    console.log("Received folder path:", folderPath, "Force new:", forceNew);

    if (!folderPath) {
      return res.status(400).json({ error: "Folder path is required" });
    }

    const fullPath = path.join(process.env.FILE_STORAGE_PATH, folderPath);
    console.log("Full path:", fullPath);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const resolvedBasePath = path.resolve(process.env.FILE_STORAGE_PATH);
    if (!resolvedPath.startsWith(resolvedBasePath)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if path exists and is a directory
    const stats = await fsPromises.stat(fullPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: "Path is not a directory" });
    }

    // Generate zip name based on folder name
    const zipName = getZipNameFromPath(fullPath);
    const zipId = path.parse(zipName).name;
    const zipPath = path.join(TEMP_DIR, zipName);

    // Check for existing zip if not forcing new creation
    if (!forceNew) {
      const existingZip = await findExistingZip(fullPath);
      if (existingZip) {
        console.log("Using existing zip file:", existingZip.path);
        return res.json({
          zipId: existingZip.zipId,
          status: "ready",
          cached: true,
        });
      }
    } else {
      // If forcing new and existing zip exists, delete it
      try {
        if (existsSync(zipPath)) {
          await fsPromises.unlink(zipPath);
          console.log("Deleted existing zip file:", zipPath);
        }
      } catch (error) {
        console.error("Error deleting existing zip:", error);
      }
    }

    // Check if there's already an active process for this zip
    if (activeZipProcesses.has(zipId)) {
      return res.json({
        zipId,
        status: "processing",
        cached: false,
      });
    }

    // Rest of the zip creation logic remains the same
    await ensureTempDir();

    const zipProcess = {
      archive: null,
      output: null,
      canceled: false,
      startTime: Date.now(),
    };
    activeZipProcesses.set(zipId, zipProcess);

    zipProcess.output = createWriteStream(zipPath);
    zipProcess.archive = archiver("zip", { zlib: { level: 9 } });

    const zipPromise = new Promise((resolve, reject) => {
      zipProcess.output.on("close", () => {
        if (!zipProcess.canceled) {
          resolve();
        }
      });

      zipProcess.output.on("error", (err) => {
        console.error("Output stream error:", err);
        reject(err);
      });

      zipProcess.archive.on("error", (err) => {
        console.error("Archive error:", err);
        reject(err);
      });

      zipProcess.archive.on("warning", (err) => {
        if (err.code === "ENOENT") {
          console.warn("Archive warning:", err);
        } else {
          reject(err);
        }
      });
    });

    zipProcess.archive.pipe(zipProcess.output);
    zipProcess.archive.directory(fullPath, path.basename(fullPath));

    let lastProgressUpdate = 0;
    zipProcess.archive.on("progress", (progress) => {
      const now = Date.now();
      if (now - lastProgressUpdate > 100) {
        lastProgressUpdate = now;
        zipProcess.progress =
          (progress.entries.processed / progress.entries.total) * 100;
      }
    });

    try {
      await zipProcess.archive.finalize();
      await zipPromise;

      if (!zipProcess.canceled) {
        setTimeout(async () => {
          try {
            if (existsSync(zipPath)) {
              await fsPromises.unlink(zipPath);
              console.log("Cleaned up zip file:", zipPath);
            }
          } catch (error) {
            console.error("Error cleaning up zip file:", error);
          }
        }, ZIP_CLEANUP_DELAY);

        res.json({
          zipId,
          status: "ready",
          cached: false,
        });
      } else {
        try {
          if (existsSync(zipPath)) {
            await fsPromises.unlink(zipPath);
          }
        } catch (unlinkError) {
          console.error("Error removing cancelled zip:", unlinkError);
        }
        res.json({
          zipId,
          status: "cancelled",
        });
      }
    } catch (error) {
      console.error("Error during zip process:", error);
      res.status(500).json({ error: "Failed to create zip file" });
    } finally {
      activeZipProcesses.delete(zipId);
    }
  } catch (error) {
    console.error("Error creating zip:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update the status endpoint
app.get("/api/zip/:zipId/status", authenticateToken, async (req, res) => {
  try {
    const { zipId } = req.params;
    const zipPath = path.join(TEMP_DIR, `${zipId}.zip`);

    if (!existsSync(zipPath)) {
      return res.json({
        status: "error",
        error: "Zip file not found",
      });
    }

    const stats = await fsPromises.stat(zipPath);
    res.json({
      status: "ready",
      size: stats.size,
      cached: Date.now() - stats.mtime.getTime() < ZIP_CLEANUP_DELAY,
    });
  } catch (error) {
    console.error("Error getting zip status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update the download endpoint
app.get("/api/zip/:zipId/download", authenticateToken, (req, res) => {
  try {
    const { zipId } = req.params;
    // Try both zipId.zip and the actual filename
    let zipPath = path.join(TEMP_DIR, `${zipId}.zip`);

    if (!existsSync(zipPath)) {
      return res.status(404).json({ error: "Zip file not found" });
    }

    const fileName = path.basename(zipPath);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/zip");

    const fileStream = createReadStream(zipPath);
    fileStream.pipe(res);

    fileStream.on("error", (error) => {
      console.error("Error streaming zip file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error streaming file" });
      }
    });

    res.on("close", () => {
      fileStream.destroy();
    });
  } catch (error) {
    console.error("Error downloading zip:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add this endpoint to your server.js
app.get("/api/folder-size/*", authenticateToken, async (req, res) => {
  try {
    const folderPath = req.params[0];
    const fullPath = path.join(process.env.FILE_STORAGE_PATH, folderPath);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const resolvedBasePath = path.resolve(process.env.FILE_STORAGE_PATH);
    if (!resolvedPath.startsWith(resolvedBasePath)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: "Path is not a directory" });
    }

    const size = await getFolderSize(fullPath);
    res.json({ size });
  } catch (error) {
    console.error("Error calculating folder size:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update the download endpoint in server.js
app.get(
  "/api/zip/:folderPath/download",
  authenticateToken,
  async (req, res) => {
    try {
      const { folderPath } = req.params;
      const fullPath = path.join(process.env.FILE_STORAGE_PATH, folderPath);
      const zipName = path.basename(fullPath) + ".zip";
      const zipPath = path.join(TEMP_DIR, zipName);

      if (!existsSync(zipPath)) {
        return res.status(404).json({ error: "Zip file not found" });
      }

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

      const fileStream = createReadStream(zipPath);
      fileStream.pipe(res);

      fileStream.on("error", (error) => {
        console.error("Error streaming zip file:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      res.on("close", () => {
        fileStream.destroy();
      });
    } catch (error) {
      console.error("Error downloading zip:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update the exists endpoint in server.js
app.get("/api/zip/:folderPath/exists", authenticateToken, async (req, res) => {
  try {
    const { folderPath } = req.params;
    const fullPath = path.join(process.env.FILE_STORAGE_PATH, folderPath);
    const zipName = path.basename(fullPath) + ".zip";
    const zipPath = path.join(TEMP_DIR, zipName);

    let exists = false;

    if (existsSync(zipPath)) {
      const stats = await stat(zipPath);
      // Check if zip is less than 1 hour old
      exists = Date.now() - stats.mtime.getTime() < ZIP_CLEANUP_DELAY;
    }

    // Log the check result for debugging
    console.log(`Zip check for ${zipName}: ${exists}`);

    res.json({ exists });
  } catch (error) {
    console.error("Error checking zip existence:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add this endpoint to handle zip cancellation
app.post("/api/zip/cancel", authenticateToken, async (req, res) => {
  try {
    const { folderPath } = req.body;
    const zipName = getZipNameFromPath(folderPath);
    const zipId = path.parse(zipName).name;
    const zipPath = path.join(TEMP_DIR, zipName);

    const zipProcess = activeZipProcesses.get(zipId);
    if (zipProcess) {
      console.log("Cancelled zip:", folderPath + ".zip");
      zipProcess.canceled = true;

      // Abort the archiver
      if (zipProcess.archive) {
        zipProcess.archive.abort();
      }

      // Close the output stream
      if (zipProcess.output) {
        zipProcess.output.end();
      }

      // Clean up the partial zip file
      try {
        if (existsSync(zipPath)) {
          await fsPromises.unlink(zipPath);
        }
      } catch (unlinkError) {
        console.error("Error removing partial zip:", unlinkError);
      }

      activeZipProcesses.delete(zipId);
    }

    res.json({ status: "cancelled" });
  } catch (error) {
    console.error("Error canceling zip:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`File storage path: ${process.env.FILE_STORAGE_PATH}`);

  if (!process.env.FILE_STORAGE_PATH) {
    console.error(
      "WARNING: FILE_STORAGE_PATH not set in environment variables"
    );
  } else if (!existsSync(process.env.FILE_STORAGE_PATH)) {
    console.error(
      "WARNING: Specified FILE_STORAGE_PATH does not exist:",
      process.env.FILE_STORAGE_PATH
    );
  } else {
    console.log("File storage path verified and accessible");
  }
});
