const express = require("express");

const {
  createRoom,
  getRoom,
  getMyRooms,
  joinRoom,
  updateRoomCode,
  leaveRoom,
  removeMember,
  grantEditAccess,
  revokeEditAccess,
  deleteRoom,
} = require("../controllers/roomController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// --------------------------------------------------
// ROOM CREATION
// --------------------------------------------------

router.post("/", protect, createRoom);

// --------------------------------------------------
// USER ROOMS
// --------------------------------------------------

router.get("/my-rooms", protect, getMyRooms);

// --------------------------------------------------
// ROOM ACCESS
// --------------------------------------------------

router.get("/:roomId", protect, getRoom);

router.post(
  "/:roomId/join",
  protect,
  joinRoom
);

// --------------------------------------------------
// CODE
// --------------------------------------------------

router.put(
  "/:roomId/code",
  protect,
  updateRoomCode
);

// --------------------------------------------------
// LEAVE
// --------------------------------------------------

router.delete(
  "/:roomId/leave",
  protect,
  leaveRoom
);

// --------------------------------------------------
// MEMBER MANAGEMENT
// --------------------------------------------------

router.delete(
  "/:roomId/members/:userId",
  protect,
  removeMember
);

router.put(
  "/:roomId/members/:userId/edit",
  protect,
  grantEditAccess
);

router.delete(
  "/:roomId/members/:userId/edit",
  protect,
  revokeEditAccess
);

// --------------------------------------------------
// DELETE ROOM
// --------------------------------------------------

router.delete(
  "/:roomId",
  protect,
  deleteRoom
);

module.exports = router;