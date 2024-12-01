// server/src/controllers/zipController.js
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TEMP_DIR = path.join(__dirname, "../temp");
const MAX_SIZE = 20 * 1024 * 1024 * 1024; // 20GB
const ZIP_EXPIRY = 60 * 60 * 1000; // 1 hour

// Store zip progress
const zipProgress = new Map();

const generateZipId = () => crypto.randomBytes(16).toString("hex");

const cleanupZip = (zipPath) => {
  setTimeout(() => {
    fs.unlink(zipPath, (err) => {
      if (err) console.error("Failed to cleanup zip:", err);
    });
  }, ZIP_EXPIRY);
};

exports.createZip = async (req, res) => {
  const { folderPath } = req.body;
  const zipId = generateZipId();
  const zipPath = path.join(TEMP_DIR, `${zipId}.zip`);

  try {
    // Check folder size
    const folderSize = await getFolderSize(folderPath);
    if (folderSize > MAX_SIZE) {
      return res.status(400).json({ error: "Folder too large" });
    }

    // Initialize progress
    zipProgress.set(zipId, {
      progress: 0,
      status: "preparing",
      folderSize,
    });

    // Create write stream
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      zipProgress.set(zipId, {
        progress: 100,
        status: "ready",
      });
      cleanupZip(zipPath);
    });

    archive.on("error", (err) => {
      zipProgress.set(zipId, {
        progress: 0,
        status: "error",
        error: err.message,
      });
      cleanupZip(zipPath);
    });

    archive.on("progress", (progress) => {
      const percent = Math.round(
        (progress.fs.processedBytes / folderSize) * 100
      );
      zipProgress.set(zipId, {
        progress: percent,
        status: "processing",
      });
    });

    archive.pipe(output);
    archive.directory(folderPath, false);
    await archive.finalize();

    res.json({ zipId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStatus = (req, res) => {
  const { zipId } = req.params;
  const progress = zipProgress.get(zipId) || {
    status: "not_found",
  };
  res.json(progress);
};

exports.downloadZip = (req, res) => {
  const { zipId } = req.params;
  const zipPath = path.join(TEMP_DIR, `${zipId}.zip`);

  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: "Zip not found" });
  }

  res.download(zipPath);
};

const getFolderSize = (folderPath) => {
  return new Promise((resolve, reject) => {
    let size = 0;
    fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
      if (err) reject(err);

      Promise.all(
        files.map((file) => {
          const filePath = path.join(folderPath, file.name);
          if (file.isDirectory()) {
            return getFolderSize(filePath);
          }
          return fs.promises.stat(filePath).then((stat) => stat.size);
        })
      )
        .then((sizes) => resolve(sizes.reduce((acc, size) => acc + size, 0)))
        .catch(reject);
    });
  });
};
