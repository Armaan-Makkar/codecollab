const express = require("express");

const {
  runCode,
  getExecutionHistory,
} = require("../controllers/executionController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Run code
router.post(
  "/",
  protect,
  runCode
);

// Get execution history
router.get(
  "/history/:roomId",
  protect,
  getExecutionHistory
);

module.exports = router;