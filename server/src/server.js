
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const jwt = require("jsonwebtoken");

const Room = require("./models/Room");
const User = require("./models/User");

const { Server } = require("socket.io");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const executionRoutes = require("./routes/executionRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 8000;

const CLIENT_URL =
  process.env.CLIENT_URL ||
  "http://localhost:5173";

// ==================================================
// DATABASE
// ==================================================

connectDB();

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ==================================================
// HEALTH CHECK
// ==================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CodeCollab API is running",
  });
});

// ==================================================
// API ROUTES
// ==================================================

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/execute", executionRoutes);

// ==================================================
// SOCKET.IO
// ==================================================

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },

  pingTimeout: 20000,
  pingInterval: 25000,
});

// ==================================================
// ONLINE USERS
// ==================================================

/*
  Internal structure:

  Map {
    roomId => Map {
      socketId => {
        userId,
        name
      }
    }
  }

  Multiple sockets are allowed for the same user.
  Example:

  Armaan opens the same room in 3 tabs:

  socketA -> Armaan
  socketB -> Armaan
  socketC -> Armaan

  Internally we keep all 3 sockets because they
  are real connections.

  BUT the frontend receives only ONE Armaan.
*/

const roomUsers = new Map();

// ==================================================
// GET UNIQUE ONLINE USERS
// ==================================================

const getUniqueRoomUsers = (roomId) => {
  const users = roomUsers.get(roomId);

  if (!users) {
    return [];
  }

  const uniqueUsers = new Map();

  for (const user of users.values()) {
    if (!uniqueUsers.has(user.userId)) {
      uniqueUsers.set(user.userId, {
        userId: user.userId,
        name: user.name,
      });
    }
  }

  return Array.from(uniqueUsers.values());
};

// ==================================================
// BROADCAST UNIQUE ROOM USERS
// ==================================================

const broadcastRoomUsers = (roomId) => {
  if (!roomId) {
    return;
  }

  io.to(roomId).emit(
    "room-users",
    getUniqueRoomUsers(roomId)
  );
};

// ==================================================
// SOCKET AUTHENTICATION
// ==================================================

io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token;

    if (!token) {
      return next(
        new Error("Authentication required")
      );
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    const user =
      await User.findById(
        decoded.userId
      ).select("-password");

    if (!user) {
      return next(
        new Error("User not found")
      );
    }

    socket.user = user;

    console.log(
      `🔐 Socket authenticated: ${user.name} (${user._id})`
    );

    next();
  } catch (error) {
    console.error(
      "❌ Socket authentication failed:",
      error.message
    );

    next(
      new Error(
        "Invalid or expired token"
      )
    );
  }
});

// ==================================================
// SOCKET CONNECTION
// ==================================================

io.on("connection", (socket) => {
  console.log(
    `🔌 Socket connected: ${socket.id}`
  );

  // =================================================
  // JOIN ROOM
  // =================================================

  socket.on(
    "join-room",
    async ({ roomId }) => {
      try {
        if (!roomId) {
          socket.emit(
            "room-error",
            {
              message:
                "Room ID is required",
            }
          );

          return;
        }

        const room =
          await Room.findOne({
            roomId,
          });

        if (!room) {
          socket.emit(
            "room-error",
            {
              message:
                "Room not found",
            }
          );

          return;
        }

        const userId =
          socket.user._id.toString();

        const userName =
          socket.user.name;

        const isMember =
          room.members.some(
            (member) =>
              member.toString() ===
              userId
          );

        const isOwner =
          room.owner.toString() ===
          userId;

        if (!isMember && !isOwner) {
          console.log(
            `🚫 Unauthorized room access: ${userId} → ${roomId}`
          );

          socket.emit(
            "room-error",
            {
              message:
                "You are not a member of this room",
            }
          );

          return;
        }

        // ---------------------------------------------
        // If this socket was already attached to a
        // different room, clean up the old room.
        // ---------------------------------------------

        if (
          socket.roomId &&
          socket.roomId !== roomId
        ) {
          const previousRoomId =
            socket.roomId;

          socket.leave(
            previousRoomId
          );

          const previousUsers =
            roomUsers.get(
              previousRoomId
            );

          if (previousUsers) {
            previousUsers.delete(
              socket.id
            );

            if (
              previousUsers.size === 0
            ) {
              roomUsers.delete(
                previousRoomId
              );
            } else {
              broadcastRoomUsers(
                previousRoomId
              );
            }
          }
        }

        // ---------------------------------------------
        // Join requested room
        // ---------------------------------------------

        socket.join(roomId);

        socket.roomId = roomId;
        socket.userId = userId;
        socket.userName = userName;

        if (
          !roomUsers.has(roomId)
        ) {
          roomUsers.set(
            roomId,
            new Map()
          );
        }

        const users =
          roomUsers.get(roomId);

        users.set(
          socket.id,
          {
            userId,
            name: userName,
          }
        );

        console.log(
          `👤 User ${userName} (${userId}) joined room ${roomId}`
        );

        console.log(
          `   Active sockets in room: ${users.size}`
        );

        console.log(
          `   Unique users in room: ${getUniqueRoomUsers(roomId).length}`
        );

        socket.emit(
          "room-joined",
          {
            roomId,
            socketId:
              socket.id,
          }
        );

        // IMPORTANT:
        // Send UNIQUE users only.
        broadcastRoomUsers(
          roomId
        );

        // Only announce a new user if this user
        // was not already present through another
        // socket/tab.
        const userAlreadyConnected =
          Array.from(
            users.values()
          ).filter(
            (user) =>
              user.userId ===
              userId
          ).length > 1;

        if (
          !userAlreadyConnected
        ) {
          socket
            .to(roomId)
            .emit(
              "user-joined",
              {
                userId,
                name: userName,
                socketId:
                  socket.id,
              }
            );
        }
      } catch (error) {
        console.error(
          "❌ Socket join-room error:",
          error
        );

        socket.emit(
          "room-error",
          {
            message:
              "Failed to join room",
          }
        );
      }
    }
  );

  // =================================================
  // CODE CHANGE
  // =================================================

  socket.on(
    "code-change",
    async (
      { roomId, code },
      callback
    ) => {
      try {
        if (
          !roomId ||
          socket.roomId !== roomId
        ) {
          return callback?.({
            success: false,
            message:
              "You are not connected to this room",
          });
        }

        const room =
          await Room.findOne({
            roomId,
          });

        if (!room) {
          return callback?.({
            success: false,
            message:
              "Room not found",
          });
        }

        const userId =
          socket.user._id.toString();

        const isOwner =
          room.owner.toString() ===
          userId;

        const isEditor =
          room.editors?.some(
            (editor) =>
              editor.toString() ===
              userId
          );

        if (
          !isOwner &&
          !isEditor
        ) {
          return callback?.({
            success: false,
            message:
              "You do not have permission to edit this room",
          });
        }

        socket
          .to(roomId)
          .emit(
            "code-change",
            code
          );

        callback?.({
          success: true,
        });
      } catch (error) {
        console.error(
          "❌ Socket code-change error:",
          error
        );

        callback?.({
          success: false,
          message:
            "Server error",
        });
      }
    }
  );

  // =================================================
  // TYPING / EDITING PRESENCE
  // =================================================

  socket.on(
    "user-typing",
    ({ roomId }) => {
      if (
        !roomId ||
        socket.roomId !== roomId
      ) {
        return;
      }

      socket
        .to(roomId)
        .emit(
          "user-typing",
          {
            userId:
              socket.user._id.toString(),

            name:
              socket.user.name,
          }
        );
    }
  );

  socket.on(
    "user-stopped-typing",
    ({ roomId }) => {
      if (
        !roomId ||
        socket.roomId !== roomId
      ) {
        return;
      }

      socket
        .to(roomId)
        .emit(
          "user-stopped-typing",
          {
            userId:
              socket.user._id.toString(),
          }
        );
    }
  );

  // =================================================
  // ROOM PING
  // =================================================

  socket.on(
    "ping-room",
    ({ roomId }) => {
      if (
        !roomId ||
        socket.roomId !== roomId
      ) {
        return;
      }

      socket.emit(
        "pong-room",
        {
          roomId,
          timestamp:
            Date.now(),
        }
      );
    }
  );

  // =================================================
  // LANGUAGE CHANGE
  // =================================================

  socket.on(
    "language-change",
    async ({
      roomId,
      language,
    }) => {
      try {
        if (
          !roomId ||
          socket.roomId !== roomId
        ) {
          return;
        }

        const room =
          await Room.findOne({
            roomId,
          });

        if (!room) {
          return;
        }

        const userId =
          socket.user._id.toString();

        const isOwner =
          room.owner.toString() ===
          userId;

        if (!isOwner) {
          return;
        }

        socket
          .to(roomId)
          .emit(
            "language-change",
            language
          );
      } catch (error) {
        console.error(
          "❌ Socket language-change error:",
          error
        );
      }
    }
  );

  // =================================================
  // REMOVE MEMBER
  // =================================================

  socket.on(
    "remove-member",
    async (
      {
        roomId,
        userId,
      },
      callback
    ) => {
      try {
        const room =
          await Room.findOne({
            roomId,
          });

        if (!room) {
          return callback?.({
            success: false,
            message:
              "Room not found",
          });
        }

        const requesterId =
          socket.user._id.toString();

        if (
          room.owner.toString() !==
          requesterId
        ) {
          return callback?.({
            success: false,
            message:
              "Only the room creator can remove members",
          });
        }

        if (
          requesterId ===
          userId.toString()
        ) {
          return callback?.({
            success: false,
            message:
              "Room creator cannot remove themselves",
          });
        }

        const targetUserId =
          userId.toString();

        const isMember =
          room.members.some(
            (member) =>
              member.toString() ===
              targetUserId
          );

        if (!isMember) {
          return callback?.({
            success: false,
            message:
              "User is not a member of this room",
          });
        }

        // Remove from database.
        room.members =
          room.members.filter(
            (member) =>
              member.toString() !==
              targetUserId
          );

        room.editors =
          room.editors.filter(
            (editor) =>
              editor.toString() !==
              targetUserId
          );

        await room.save();

        // Remove ALL sockets belonging to this
        // user from the room.
        const users =
          roomUsers.get(roomId);

        if (users) {
          for (
            const [
              socketId,
              onlineUser,
            ] of users.entries()
          ) {
            if (
              onlineUser.userId ===
              targetUserId
            ) {
              const targetSocket =
                io.sockets.sockets.get(
                  socketId
                );

              if (targetSocket) {
                targetSocket.emit(
                  "removed-from-room",
                  {
                    roomId,
                    message:
                      "You have been removed from this room by the creator.",
                  }
                );

                targetSocket.leave(
                  roomId
                );

                targetSocket.roomId =
                  null;
              }

              users.delete(
                socketId
              );
            }
          }

          if (
            users.size === 0
          ) {
            roomUsers.delete(
              roomId
            );
          } else {
            broadcastRoomUsers(
              roomId
            );
          }
        }

        console.log(
          `🚫 User ${targetUserId} removed from room ${roomId}`
        );

        callback?.({
          success: true,
          message:
            "Member removed successfully",
        });
      } catch (error) {
        console.error(
          "❌ Remove member error:",
          error
        );

        callback?.({
          success: false,
          message:
            "Failed to remove member",
        });
      }
    }
  );

  // =================================================
  // GRANT EDIT ACCESS
  // =================================================

  socket.on(
    "grant-edit-access",
    async (
      {
        roomId,
        userId,
      },
      callback
    ) => {
      try {
        const room =
          await Room.findOne({
            roomId,
          });

        if (!room) {
          return callback?.({
            success: false,
            message:
              "Room not found",
          });
        }

        const requesterId =
          socket.user._id.toString();

        if (
          room.owner.toString() !==
          requesterId
        ) {
          return callback?.({
            success: false,
            message:
              "Only the room creator can grant edit access",
          });
        }

        const targetUserId =
          userId.toString();

        const isMember =
          room.members.some(
            (member) =>
              member.toString() ===
              targetUserId
          );

        if (!isMember) {
          return callback?.({
            success: false,
            message:
              "User is not a member of this room",
          });
        }

        const alreadyEditor =
          room.editors.some(
            (editor) =>
              editor.toString() ===
              targetUserId
          );

        if (!alreadyEditor) {
          room.editors.push(
            targetUserId
          );

          await room.save();
        }

        io.to(roomId).emit(
          "permissions-updated",
          {
            userId:
              targetUserId,
            canEdit: true,
          }
        );

        callback?.({
          success: true,
          message:
            "Edit access granted",
        });
      } catch (error) {
        console.error(
          "❌ Grant edit access error:",
          error
        );

        callback?.({
          success: false,
          message:
            "Failed to grant edit access",
        });
      }
    }
  );

  // =================================================
  // REVOKE EDIT ACCESS
  // =================================================

  socket.on(
    "revoke-edit-access",
    async (
      {
        roomId,
        userId,
      },
      callback
    ) => {
      try {
        const room =
          await Room.findOne({
            roomId,
          });

        if (!room) {
          return callback?.({
            success: false,
            message:
              "Room not found",
          });
        }

        const requesterId =
          socket.user._id.toString();

        if (
          room.owner.toString() !==
          requesterId
        ) {
          return callback?.({
            success: false,
            message:
              "Only the room creator can revoke edit access",
          });
        }

        const targetUserId =
          userId.toString();

        room.editors =
          room.editors.filter(
            (editor) =>
              editor.toString() !==
              targetUserId
          );

        await room.save();

        io.to(roomId).emit(
          "permissions-updated",
          {
            userId:
              targetUserId,
            canEdit: false,
          }
        );

        callback?.({
          success: true,
          message:
            "Edit access revoked",
        });
      } catch (error) {
        console.error(
          "❌ Revoke edit access error:",
          error
        );

        callback?.({
          success: false,
          message:
            "Failed to revoke edit access",
        });
      }
    }
  );

  // =================================================
  // DELETE ROOM
  // =================================================

  socket.on(
    "delete-room",
    async (
      { roomId },
      callback
    ) => {
      try {
        const room =
          await Room.findOne({
            roomId,
          });

        if (!room) {
          return callback?.({
            success: false,
            message:
              "Room not found",
          });
        }

        const requesterId =
          socket.user._id.toString();

        if (
          room.owner.toString() !==
          requesterId
        ) {
          return callback?.({
            success: false,
            message:
              "Only the room creator can delete this room",
          });
        }

        io.to(roomId).emit(
          "room-deleted",
          {
            roomId,
            message:
              "This room has been deleted by the creator.",
          }
        );

        const users =
          roomUsers.get(roomId);

        if (users) {
          for (
            const socketId of users.keys()
          ) {
            const targetSocket =
              io.sockets.sockets.get(
                socketId
              );

            if (targetSocket) {
              targetSocket.leave(
                roomId
              );

              targetSocket.roomId =
                null;
            }
          }

          roomUsers.delete(
            roomId
          );
        }

        await Room.deleteOne({
          _id: room._id,
        });

        console.log(
          `🗑️ Room ${roomId} deleted by ${requesterId}`
        );

        callback?.({
          success: true,
          message:
            "Room deleted successfully",
        });
      } catch (error) {
        console.error(
          "❌ Delete room error:",
          error
        );

        callback?.({
          success: false,
          message:
            "Failed to delete room",
        });
      }
    }
  );

  // =================================================
  // DISCONNECT
  // =================================================

  socket.on(
    "disconnect",
    (reason) => {
      console.log(
        `❌ Socket disconnected: ${socket.id}`
      );

      console.log(
        `   Reason: ${reason}`
      );

      const roomId =
        socket.roomId;

      if (
        !roomId ||
        !roomUsers.has(roomId)
      ) {
        return;
      }

      const users =
        roomUsers.get(roomId);

      users.delete(
        socket.id
      );

      if (
        users.size === 0
      ) {
        roomUsers.delete(
          roomId
        );

        return;
      }

      // Send unique users after removing
      // this socket.
      broadcastRoomUsers(
        roomId
      );
    }
  );
});

// ==================================================
// START SERVER
// ==================================================

server.listen(
  PORT,
  () => {
    console.log(
      `🚀 CodeCollab server running on port ${PORT}`
    );

    console.log(
      `🌐 API: http://localhost:${PORT}`
    );

    console.log(
      `🔌 Socket.IO: http://localhost:${PORT}`
    );

    console.log(
      `🩺 Health: http://localhost:${PORT}/api/health`
    );
  }
);

