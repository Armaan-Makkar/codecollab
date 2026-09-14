const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // JOIN ROOM
  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);

    console.log(
      `👤 User ${userId} joined room ${roomId}`
    );

    socket.emit("room-joined", {
      roomId,
      socketId: socket.id,
    });

    socket.to(roomId).emit("user-joined", {
      userId,
      socketId: socket.id,
    });
  });

  // CODE CHANGE
 socket.on("code-change", ({ roomId, code, userId }, callback) => {
  console.log(
    `💻 Code changed in room ${roomId} by ${userId}`
  );

  socket.to(roomId).emit("code-change", code);

  if (callback) {
    callback();
  }
});

  // LANGUAGE CHANGE
  socket.on("language-change", ({ roomId, language, userId }) => {
    console.log(
      `🌐 Language changed in room ${roomId}: ${language}`
    );

    socket.to(roomId).emit("language-change", language);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});