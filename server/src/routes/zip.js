const express = require("express");
const router = express.Router();
const zipController = require("../controllers/zipController");

router.post("/zip", zipController.createZip);
router.get("/zip/:zipId/status", zipController.getStatus);
router.get("/zip/:zipId/download", zipController.downloadZip);

module.exports = router;
