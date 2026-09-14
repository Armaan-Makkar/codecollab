const Room = require("../models/Room");

// --------------------------------------------------
// CREATE ROOM
// --------------------------------------------------

const createRoom = async (req, res) => {
  try {
    const { name, language } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Room name is required",
      });
    }

    const roomId = Math.random()
      .toString(36)
      .substring(2, 10);

    const room = await Room.create({
      roomId,
      name,
      owner: req.user._id,
      members: [req.user._id],
      editors: [],
      language: language || "javascript",
      code: "",
    });

    res.status(201).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error(
      "Create room error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create room",
    });
  }
};

// --------------------------------------------------
// GET ROOM
// --------------------------------------------------

const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({
      roomId,
    })
      .populate(
        "owner",
        "name email"
      )
      .populate(
        "members",
        "name email"
      )
      .populate(
        "editors",
        "name email"
      );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const isMember =
      room.members.some(
        (member) =>
          member._id.toString() ===
          req.user._id.toString()
      );

    const isOwner =
      room.owner._id.toString() ===
      req.user._id.toString();

    if (!isMember && !isOwner) {
      return res.status(403).json({
        success: false,
        message:
          "You are not a member of this room",
      });
    }

    res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    console.error(
      "Get room error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to get room",
    });
  }
};

// --------------------------------------------------
// JOIN ROOM
// --------------------------------------------------

const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({
      roomId,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const alreadyMember =
      room.members.some(
        (member) =>
          member.toString() ===
          req.user._id.toString()
      );

    if (!alreadyMember) {
      room.members.push(
        req.user._id
      );

      await room.save();
    }

    res.status(200).json({
      success: true,
      message:
        "Joined room successfully",
      room,
    });
  } catch (error) {
    console.error(
      "Join room error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to join room",
    });
  }
};

// --------------------------------------------------
// UPDATE ROOM CODE
// --------------------------------------------------

const updateRoomCode = async (
  req,
  res
) => {
  try {
    const { roomId } = req.params;
    const { code, language } =
      req.body;

    const room =
      await Room.findOne({
        roomId,
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const userId =
      req.user._id.toString();

    const isOwner =
      room.owner.toString() ===
      userId;

    const isEditor =
      room.editors?.some(
        (editor) =>
          editor.toString() ===
          userId
      );

    if (!isOwner && !isEditor) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to edit this room",
      });
    }

    if (typeof code === "string") {
      room.code = code;
    }

    if (language) {
      room.language = language;
    }

    await room.save();

    res.status(200).json({
      success: true,
      message:
        "Room updated successfully",
      room,
    });
  } catch (error) {
    console.error(
      "Update room code error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to update room",
    });
  }
};

// --------------------------------------------------
// LEAVE ROOM
// --------------------------------------------------

const leaveRoom = async (
  req,
  res
) => {
  try {
    const { roomId } =
      req.params;

    const room =
      await Room.findOne({
        roomId,
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const userId =
      req.user._id.toString();

    const isOwner =
      room.owner.toString() ===
      userId;

    // ----------------------------------------------
    // CREATOR CANNOT LEAVE
    // ----------------------------------------------

    if (isOwner) {
      return res.status(400).json({
        success: false,
        message:
          "Room creator cannot leave the room. Delete the room instead.",
      });
    }

    // ----------------------------------------------
    // CHECK MEMBERSHIP
    // ----------------------------------------------

    const isMember =
      room.members.some(
        (member) =>
          member.toString() ===
          userId
      );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message:
          "You are not a member of this room",
      });
    }

    // ----------------------------------------------
    // REMOVE MEMBER
    // ----------------------------------------------

    room.members =
      room.members.filter(
        (member) =>
          member.toString() !==
          userId
      );

    // Also remove edit access
    room.editors =
      room.editors.filter(
        (editor) =>
          editor.toString() !==
          userId
      );

    await room.save();

    res.status(200).json({
      success: true,
      message:
        "You left the room successfully",
    });
  } catch (error) {
    console.error(
      "Leave room error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to leave room",
    });
  }
};

// --------------------------------------------------
// REMOVE MEMBER
// --------------------------------------------------

const removeMember = async (
  req,
  res
) => {
  try {
    const {
      roomId,
      userId,
    } = req.params;

    const room =
      await Room.findOne({
        roomId,
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found",
      });
    }

    const requesterId =
      req.user._id.toString();

    // ----------------------------------------------
    // ONLY OWNER
    // ----------------------------------------------

    if (
      room.owner.toString() !==
      requesterId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the room creator can remove members",
      });
    }

    // ----------------------------------------------
    // OWNER CANNOT REMOVE THEMSELVES
    // ----------------------------------------------

    if (
      requesterId ===
      userId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Room creator cannot remove themselves",
      });
    }

    // ----------------------------------------------
    // CHECK MEMBER
    // ----------------------------------------------

    const isMember =
      room.members.some(
        (member) =>
          member.toString() ===
          userId.toString()
      );

    if (!isMember) {
      return res.status(404).json({
        success: false,
        message:
          "User is not a member of this room",
      });
    }

    // ----------------------------------------------
    // REMOVE FROM MEMBERS
    // ----------------------------------------------

    room.members =
      room.members.filter(
        (member) =>
          member.toString() !==
          userId.toString()
      );

    // ----------------------------------------------
    // REMOVE EDIT ACCESS TOO
    // ----------------------------------------------

    room.editors =
      room.editors.filter(
        (editor) =>
          editor.toString() !==
          userId.toString()
      );

    await room.save();

    console.log(
      `👤 User ${userId} removed from room ${roomId} by creator ${requesterId}`
    );

    res.status(200).json({
      success: true,
      message:
        "Member removed successfully",
    });
  } catch (error) {
    console.error(
      "Remove member error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to remove member",
    });
  }
};

// ==================================================
// GRANT EDIT ACCESS
// ==================================================

const grantEditAccess = async (
  req,
  res
) => {
  try {
    const {
      roomId,
      userId,
    } = req.params;

    const room =
      await Room.findOne({
        roomId,
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found",
      });
    }

    const requesterId =
      req.user._id.toString();

    // ----------------------------------------------
    // ONLY OWNER
    // ----------------------------------------------

    if (
      room.owner.toString() !==
      requesterId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the room creator can grant edit access",
      });
    }

    // ----------------------------------------------
    // CHECK MEMBER
    // ----------------------------------------------

    const isMember =
      room.members.some(
        (member) =>
          member.toString() ===
          userId.toString()
      );

    if (!isMember) {
      return res.status(404).json({
        success: false,
        message:
          "User is not a member of this room",
      });
    }

    // ----------------------------------------------
    // CHECK EXISTING EDITOR
    // ----------------------------------------------

    const alreadyEditor =
      room.editors.some(
        (editor) =>
          editor.toString() ===
          userId.toString()
      );

    if (!alreadyEditor) {
      room.editors.push(
        userId
      );

      await room.save();
    }

    res.status(200).json({
      success: true,
      message:
        "Edit access granted",
    });
  } catch (error) {
    console.error(
      "Grant edit access error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to grant edit access",
    });
  }
};

// ==================================================
// REVOKE EDIT ACCESS
// ==================================================

const revokeEditAccess = async (
  req,
  res
) => {
  try {
    const {
      roomId,
      userId,
    } = req.params;

    const room =
      await Room.findOne({
        roomId,
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found",
      });
    }

    const requesterId =
      req.user._id.toString();

    // ----------------------------------------------
    // ONLY OWNER
    // ----------------------------------------------

    if (
      room.owner.toString() !==
      requesterId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the room creator can revoke edit access",
      });
    }

    room.editors =
      room.editors.filter(
        (editor) =>
          editor.toString() !==
          userId.toString()
      );

    await room.save();

    res.status(200).json({
      success: true,
      message:
        "Edit access revoked",
    });
  } catch (error) {
    console.error(
      "Revoke edit access error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to revoke edit access",
    });
  }
};

// ==================================================
// DELETE ROOM
// ==================================================

const deleteRoom = async (
  req,
  res
) => {
  try {
    const { roomId } =
      req.params;

    const room =
      await Room.findOne({
        roomId,
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found",
      });
    }

    const requesterId =
      req.user._id.toString();

    // ----------------------------------------------
    // ONLY OWNER
    // ----------------------------------------------

    if (
      room.owner.toString() !==
      requesterId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the room creator can delete this room",
      });
    }

    await Room.deleteOne({
      _id: room._id,
    });

    console.log(
      `🗑️ Room ${roomId} deleted by ${requesterId}`
    );

    res.status(200).json({
      success: true,
      message:
        "Room deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete room error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to delete room",
    });
  }
};
// ==================================================
// GET MY ROOMS
// ==================================================

const getMyRooms = async (req, res) => {
  try {
    const userId = req.user._id;

    const rooms = await Room.find({
      members: userId,
    })
      .populate("owner", "name email")
      .populate("members", "name email")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error("Get my rooms error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get your rooms",
    });
  }
};

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
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
};