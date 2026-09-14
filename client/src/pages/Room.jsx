import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";

import { useAuth } from "../context/AuthContext";

import {
  getRoom,
  updateRoomCode,
  leaveRoom,
} from "../services/roomService";

import socket from "../socket/socket";
import api from "../services/api";

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [code, setCode] = useState("// Start coding...");
  const [language, setLanguage] = useState("javascript");
  const [socketStatus, setSocketStatus] = useState("CONNECTING...");
  const [onlineUsers, setOnlineUsers] = useState([]);

  // LIVE EDITING PRESENCE
  const [typingUsers, setTypingUsers] = useState([]);

  const [roomOwnerId, setRoomOwnerId] = useState(null);
  const [editorIds, setEditorIds] = useState([]);

  const [output, setOutput] = useState("");
  const [executionError, setExecutionError] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const [executionHistory, setExecutionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const [memberToDeleteRoom, setMemberToDeleteRoom] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [deleteRoomError, setDeleteRoomError] = useState("");

  const [permissionLoading, setPermissionLoading] = useState(null);
  const [permissionError, setPermissionError] = useState("");

  const [copiedItem, setCopiedItem] = useState("");

  const isOwner = roomOwnerId === user?.id;
  const canEdit = isOwner || editorIds.includes(user?.id);

  // ==================================================
  // LOAD ROOM
  // ==================================================

  useEffect(() => {
    const loadRoom = async () => {
      if (!roomId) return;

      try {
        const data = await getRoom(roomId);

        setCode(data.room.code || "// Start coding...");
        setLanguage(data.room.language || "javascript");
        setRoomOwnerId(data.room.owner?._id);

        const editors = data.room.editors || [];

        setEditorIds(
          editors.map((editor) =>
            typeof editor === "string" ? editor : editor._id
          )
        );
      } catch (error) {
        console.error(
          "❌ Failed to load room:",
          error.response?.data || error.message
        );

        if (error.response?.status === 403) {
          navigate("/dashboard", { replace: true });
        }
      }
    };

    loadRoom();
  }, [roomId, navigate]);

  // ==================================================
  // EXECUTION HISTORY
  // ==================================================

  const loadExecutionHistory = async () => {
    if (!roomId) return;

    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await api.get(`/execute/history/${roomId}`);

      setExecutionHistory(response.data.executions || []);
    } catch (error) {
      console.error(
        "❌ Failed to load execution history:",
        error.response?.data || error.message
      );

      setHistoryError(
        error.response?.data?.message ||
          "Failed to load execution history"
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadExecutionHistory();
  }, [roomId]);

  // ==================================================
  // SOCKET
  // ==================================================

  useEffect(() => {
    if (!roomId || !user?.id) return;

    socket.auth = {
      token: localStorage.getItem("token"),
    };

    const handleConnect = () => {
      setSocketStatus("CONNECTED");

      socket.emit("join-room", {
        roomId,
      });
    };

    const handleConnectError = (error) => {
      console.error(
        "❌ Socket connection error:",
        error.message
      );

      setSocketStatus("CONNECTION ERROR");
    };

    const handleRoomError = (data) => {
      console.error("❌ Room error:", data.message);

      setSocketStatus("ACCESS DENIED");

      if (data.message?.includes("not a member")) {
        navigate("/dashboard", { replace: true });
      }
    };

    const handleRoomUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleCodeChange = (newCode) => {
      setCode(newCode);
    };

    const handleLanguageChange = (newLanguage) => {
      setLanguage(newLanguage);
    };

    const handleUserTyping = (data) => {
      if (!data?.userId || data.userId === user?.id) return;

      setTypingUsers((currentUsers) => {
        const alreadyTyping = currentUsers.some(
          (typingUser) => typingUser.userId === data.userId
        );

        if (alreadyTyping) return currentUsers;

        return [
          ...currentUsers,
          {
            userId: data.userId,
            name: data.name || "Unknown User",
          },
        ];
      });
    };

    const handleUserStoppedTyping = (data) => {
      if (!data?.userId) return;

      setTypingUsers((currentUsers) =>
        currentUsers.filter(
          (typingUser) => typingUser.userId !== data.userId
        )
      );
    };

    const handlePermissionsUpdated = (data) => {
      setEditorIds((currentIds) => {
        if (
          data.canEdit &&
          !currentIds.includes(data.userId)
        ) {
          return [...currentIds, data.userId];
        }

        if (!data.canEdit) {
          return currentIds.filter(
            (id) => id !== data.userId
          );
        }

        return currentIds;
      });
    };

    const handleRemovedFromRoom = (data) => {
      alert(
        data?.message ||
          "You have been removed from this room."
      );

      socket.disconnect();

      navigate("/dashboard", { replace: true });
    };

    const handleRoomDeleted = (data) => {
      alert(
        data?.message ||
          "This room has been deleted."
      );

      socket.disconnect();

      navigate("/dashboard", { replace: true });
    };

    const handleDisconnect = (reason) => {
      console.log("❌ Socket disconnected:", reason);

      setSocketStatus("DISCONNECTED");
      setOnlineUsers([]);
      setTypingUsers([]);
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("room-error", handleRoomError);
    socket.on("room-users", handleRoomUsers);
    socket.on("code-change", handleCodeChange);
    socket.on("language-change", handleLanguageChange);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stopped-typing", handleUserStoppedTyping);
    socket.on("permissions-updated", handlePermissionsUpdated);
    socket.on("removed-from-room", handleRemovedFromRoom);
    socket.on("room-deleted", handleRoomDeleted);
    socket.on("disconnect", handleDisconnect);

    socket.connect();

    return () => {
      clearTimeout(window.typingTimer);
      clearTimeout(window.codeSaveTimer);

      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("room-error", handleRoomError);
      socket.off("room-users", handleRoomUsers);
      socket.off("code-change", handleCodeChange);
      socket.off("language-change", handleLanguageChange);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stopped-typing", handleUserStoppedTyping);
      socket.off("permissions-updated", handlePermissionsUpdated);
      socket.off("removed-from-room", handleRemovedFromRoom);
      socket.off("room-deleted", handleRoomDeleted);
      socket.off("disconnect", handleDisconnect);

      socket.disconnect();
    };
  }, [roomId, user, navigate]);

  // ==================================================
  // TYPING PRESENCE
  // ==================================================

  const handleTypingPresence = () => {
    if (!canEdit || !socket.connected) return;

    socket.emit("user-typing", { roomId });

    clearTimeout(window.typingTimer);

    window.typingTimer = setTimeout(() => {
      if (socket.connected) {
        socket.emit("user-stopped-typing", { roomId });
      }
    }, 1000);
  };

  // ==================================================
  // EDITOR CHANGE
  // ==================================================

  const handleEditorChange = (value) => {
    if (!canEdit) return;

    const newCode = value || "";

    setCode(newCode);
    handleTypingPresence();

    socket.emit(
      "code-change",
      {
        roomId,
        code: newCode,
      },
      (response) => {
        if (!response?.success) {
          console.error(
            "❌ Code change rejected:",
            response?.message
          );
        }
      }
    );

    clearTimeout(window.codeSaveTimer);

    window.codeSaveTimer = setTimeout(async () => {
      try {
        await updateRoomCode(roomId, {
          code: newCode,
          language,
        });
      } catch (error) {
        console.error(
          "❌ Failed to save code:",
          error.response?.data || error.message
        );
      }
    }, 1000);
  };

  // ==================================================
  // LANGUAGE CHANGE
  // ==================================================

  const handleLanguageChange = (event) => {
    if (!isOwner) return;

    const newLanguage = event.target.value;

    setLanguage(newLanguage);

    socket.emit("language-change", {
      roomId,
      language: newLanguage,
    });

    clearTimeout(window.codeSaveTimer);

    window.codeSaveTimer = setTimeout(async () => {
      try {
        await updateRoomCode(roomId, {
          code,
          language: newLanguage,
        });
      } catch (error) {
        console.error(
          "❌ Failed to save language:",
          error.response?.data || error.message
        );
      }
    }, 1000);
  };

  // ==================================================
  // RUN CODE
  // ==================================================

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput("");
    setExecutionError("");

    try {
      const response = await api.post("/execute", {
        roomId,
        code,
        language,
      });

      const result = response.data.result;

      setOutput(result?.output || "");
      setExecutionError(result?.error || "");

      await loadExecutionHistory();
    } catch (error) {
      setExecutionError(
        error.response?.data?.message ||
          "Code execution failed"
      );
    } finally {
      setIsRunning(false);
    }
  };

  // ==================================================
  // REMOVE MEMBER
  // ==================================================

  const handleRemoveMember = async () => {
    if (!memberToRemove || !isOwner) return;

    setIsRemovingMember(true);
    setRemoveError("");

    socket.emit(
      "remove-member",
      {
        roomId,
        userId: memberToRemove.userId,
      },
      (response) => {
        if (response?.success) {
          setMemberToRemove(null);
        } else {
          setRemoveError(
            response?.message ||
              "Failed to remove member"
          );
        }

        setIsRemovingMember(false);
      }
    );
  };

  // ==================================================
  // GRANT EDIT
  // ==================================================

  const handleGrantEdit = (userId) => {
    if (!isOwner) return;

    setPermissionLoading(userId);
    setPermissionError("");

    socket.emit(
      "grant-edit-access",
      {
        roomId,
        userId,
      },
      (response) => {
        if (!response?.success) {
          setPermissionError(
            response?.message ||
              "Failed to grant edit access"
          );
        }

        setPermissionLoading(null);
      }
    );
  };

  // ==================================================
  // REVOKE EDIT
  // ==================================================

  const handleRevokeEdit = (userId) => {
    if (!isOwner) return;

    setPermissionLoading(userId);
    setPermissionError("");

    socket.emit(
      "revoke-edit-access",
      {
        roomId,
        userId,
      },
      (response) => {
        if (!response?.success) {
          setPermissionError(
            response?.message ||
              "Failed to revoke edit access"
          );
        }

        setPermissionLoading(null);
      }
    );
  };

  // ==================================================
  // DELETE ROOM
  // ==================================================

  const handleDeleteRoom = () => {
    if (!isOwner) return;

    setDeleteRoomError("");
    setIsDeletingRoom(true);

    socket.emit(
      "delete-room",
      { roomId },
      (response) => {
        if (response?.success) {
          socket.disconnect();

          navigate("/dashboard", {
            replace: true,
          });
        } else {
          setDeleteRoomError(
            response?.message ||
              "Failed to delete room"
          );

          setIsDeletingRoom(false);
        }
      }
    );
  };

  // ==================================================
  // LEAVE ROOM
  // ==================================================

  const handleLeaveRoom = async () => {
    setLeaveError("");
    setIsLeaving(true);

    try {
      clearTimeout(window.typingTimer);

      socket.emit("user-stopped-typing", {
        roomId,
      });

      await leaveRoom(roomId);

      socket.disconnect();

      navigate("/dashboard");
    } catch (error) {
      setLeaveError(
        error.response?.data?.message ||
          "Failed to leave room"
      );

      setIsLeaving(false);
    }
  };

  // ==================================================
  // COPY / UI HELPERS
  // ==================================================

  const copyText = async (text, itemName) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedItem(itemName);

      setTimeout(() => {
        setCopiedItem("");
      }, 1800);
    } catch (error) {
      console.error("❌ Copy failed:", error);
    }
  };

  const copyRoomId = () => {
    copyText(roomId, "room");
  };

  const copyInviteLink = () => {
    const inviteLink =
      `${window.location.origin}/room/${roomId}`;

    copyText(inviteLink, "invite");
  };

  const clearOutput = () => {
    setOutput("");
    setExecutionError("");
  };

  const getConnectionLabel = () => {
    switch (socketStatus) {
      case "CONNECTED":
        return "CONNECTED";
      case "RECONNECTING":
        return "RECONNECTING";
      case "DISCONNECTED":
        return "DISCONNECTED";
      default:
        return socketStatus;
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==================================================
  // KEYBOARD SHORTCUTS
  // ==================================================

  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      const modifier = event.ctrlKey || event.metaKey;

      if (!modifier) return;

      if (event.key === "Enter") {
        event.preventDefault();

        if (!isRunning) {
          handleRunCode();
        }
      }

      if (
        event.shiftKey &&
        event.key.toLowerCase() === "c"
      ) {
        event.preventDefault();
        copyRoomId();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyboardShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboardShortcut
      );
    };
  }, [isRunning, roomId, code, language]);

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-[#F3EED8] text-[#171717]">

      {/* HEADER */}

      <header className="border-b-[3px] border-[#171717]">
        <div className="flex flex-col gap-5 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <p className="classification">
              CODECOLLAB / REAL-TIME ROOM
            </p>

            <h1 className="editorial-heading mt-2 text-4xl">
              Coding Room
            </h1>

            <p className="mt-2 font-mono text-sm text-[#716F62]">
              Collaborative programming workspace
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5">

            <div className="text-right">
              <p className="classification">
                ROOM ID
              </p>

              <p className="font-mono text-xl font-semibold">
                {roomId}
              </p>
            </div>

            <button
              onClick={copyRoomId}
              className="border-2 border-[#171717] bg-[#E8E1C8] px-4 py-2 font-mono text-xs font-semibold uppercase hover:bg-[#171717] hover:text-[#F3EED8]"
            >
              {copiedItem === "room"
                ? "COPIED"
                : "COPY ID"}
            </button>

            <button
              onClick={copyInviteLink}
              className="border-2 border-[#171717] bg-[#E8E1C8] px-4 py-2 font-mono text-xs font-semibold uppercase hover:bg-[#171717] hover:text-[#F3EED8]"
            >
              {copiedItem === "invite"
                ? "COPIED"
                : "COPY INVITE"}
            </button>

            <div className="border-l-2 border-[#171717] pl-5">

              <p className="classification">
                CONNECTION
              </p>

              <div className="mt-1 flex items-center justify-end gap-2">

                <span
                  className={`h-3 w-3 ${
                    socketStatus === "CONNECTED"
                      ? "bg-green-600"
                      : "bg-[#C9183E]"
                  }`}
                />

                <span className="font-mono text-sm font-semibold">
                  {getConnectionLabel()}
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* SHARE BAR */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#171717] px-8 py-3">

          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#716F62]">
            {onlineUsers.length} ONLINE /{" "}
            {typingUsers.length} EDITING
          </div>

          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#716F62]">
            INVITE LINK: {window.location.origin}/room/{roomId}
          </div>

        </div>
      </header>

      {/* CONNECTION WARNING */}

      {socketStatus !== "CONNECTED" && (
        <div className="border-b-2 border-[#171717] bg-[#C9183E] px-8 py-3 text-[#F3EED8]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
            {socketStatus === "RECONNECTING"
              ? "Connection interrupted — attempting to reconnect..."
              : socketStatus === "DISCONNECTED"
              ? "Disconnected from collaboration server."
              : `Socket status: ${socketStatus}`}
          </p>
        </div>
      )}

      {/* TOOLBAR */}

      <div className="border-b-2 border-[#171717] px-8 py-4">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div className="flex flex-wrap items-end gap-8">

            <div>
              <p className="classification mb-1">
                LANGUAGE
              </p>

              <select
                value={language}
                onChange={handleLanguageChange}
                disabled={!isOwner}
                className="border-2 border-[#171717] bg-[#F3EED8] px-4 py-2 font-mono uppercase disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="javascript">
                  JavaScript
                </option>

                <option value="python">
                  Python
                </option>

                <option value="java">
                  Java
                </option>

                <option value="cpp">
                  C++
                </option>
              </select>
            </div>

            <div>
              <p className="classification mb-1">
                ACCESS
              </p>

              <p
                className={`font-mono text-sm font-semibold ${
                  isOwner
                    ? "text-[#171717]"
                    : canEdit
                    ? "text-green-700"
                    : "text-[#C9183E]"
                }`}
              >
                {isOwner
                  ? "CREATOR / FULL CONTROL"
                  : canEdit
                  ? "EDITOR / EDIT ENABLED"
                  : "VIEWER / VIEW ONLY"}
              </p>
            </div>

            <button
              onClick={() =>
                setShowCollaborators(
                  !showCollaborators
                )
              }
              className="border-2 border-[#171717] bg-[#E8E1C8] px-4 py-2 font-mono text-sm font-semibold uppercase hover:bg-[#171717] hover:text-[#F3EED8]"
            >
              {showCollaborators
                ? "HIDE COLLABORATORS"
                : `COLLABORATORS (${onlineUsers.length})`}
            </button>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <span className="font-mono text-[9px] uppercase tracking-wider text-[#716F62]">
              ⌘/CTRL + ENTER
            </span>

            <button
              onClick={() =>
                setShowLeaveConfirm(true)
              }
              className="border-2 border-[#C9183E] px-4 py-2 font-mono text-sm font-semibold uppercase text-[#C9183E] hover:bg-[#C9183E] hover:text-[#F3EED8]"
            >
              LEAVE ROOM
            </button>

            <button
              className="brutalist-button"
              onClick={handleRunCode}
              disabled={isRunning}
            >
              {isRunning
                ? "RUNNING..."
                : "RUN CODE"}
            </button>

            <button
              onClick={clearOutput}
              disabled={isRunning}
              className="border-2 border-[#171717] px-4 py-2 font-mono text-sm font-semibold uppercase hover:bg-[#171717] hover:text-[#F3EED8] disabled:opacity-50"
            >
              CLEAR OUTPUT
            </button>

          </div>

        </div>
      </div>

      {/* COLLABORATORS */}

      {showCollaborators && (
        <div className="border-b-2 border-[#171717] bg-[#E8E1C8] px-8 py-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="classification">
                {isOwner
                  ? "CREATOR CONTROLS / ROOM MEMBERS"
                  : "ROOM MEMBERS"}
              </p>

              <p className="mt-1 font-mono text-sm">
                {onlineUsers.length} currently online /{" "}
                {typingUsers.length} editing
              </p>
            </div>

            <button
              onClick={() =>
                setShowCollaborators(false)
              }
              className="border-2 border-[#171717] px-3 py-2 font-mono text-xs font-semibold hover:bg-[#171717] hover:text-[#F3EED8]"
            >
              CLOSE
            </button>

          </div>

          <div className="mt-5 border-[3px] border-[#171717]">

            {onlineUsers.map(
              (onlineUser, index) => {

                const isCurrentUser =
                  onlineUser.userId === user?.id;

                const isCurrentOwner =
                  onlineUser.userId === roomOwnerId;

                const hasEditAccess =
                  editorIds.includes(
                    onlineUser.userId
                  );

                const isTyping =
                  typingUsers.some(
                    (typingUser) =>
                      typingUser.userId ===
                      onlineUser.userId
                  );

                return (
                  <div
                    key={`${onlineUser.userId}-${index}`}
                    className="flex flex-col gap-4 border-b-2 border-[#171717] bg-[#F3EED8] px-5 py-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between"
                  >

                    <div className="flex items-center gap-4">

                      <span className="h-3 w-3 bg-green-600" />

                      <div>

                        <p className="font-mono font-semibold">
                          {onlineUser.name ||
                            "Unknown User"}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-3">

                          <span className="classification">
                            {isCurrentOwner
                              ? "CREATOR"
                              : hasEditAccess
                              ? "EDITOR"
                              : "VIEWER"}
                          </span>

                          {isCurrentUser && (
                            <span className="classification text-green-700">
                              YOU
                            </span>
                          )}

                          {isTyping && (
                            <span className="classification text-[#C9183E]">
                              EDITING
                            </span>
                          )}

                        </div>

                      </div>

                    </div>

                    {isOwner &&
                      !isCurrentOwner &&
                      !isCurrentUser && (
                        <div className="flex flex-wrap items-center gap-2">

                          {hasEditAccess ? (
                            <button
                              onClick={() =>
                                handleRevokeEdit(
                                  onlineUser.userId
                                )
                              }
                              disabled={
                                permissionLoading ===
                                onlineUser.userId
                              }
                              className="border-2 border-[#171717] px-3 py-2 font-mono text-xs font-semibold uppercase hover:bg-[#171717] hover:text-[#F3EED8] disabled:opacity-50"
                            >
                              {permissionLoading ===
                              onlineUser.userId
                                ? "..."
                                : "REVOKE EDIT"}
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleGrantEdit(
                                  onlineUser.userId
                                )
                              }
                              disabled={
                                permissionLoading ===
                                onlineUser.userId
                              }
                              className="border-2 border-green-700 px-3 py-2 font-mono text-xs font-semibold uppercase text-green-700 hover:bg-green-700 hover:text-[#F3EED8] disabled:opacity-50"
                            >
                              {permissionLoading ===
                              onlineUser.userId
                                ? "..."
                                : "GRANT EDIT"}
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setRemoveError("");
                              setMemberToRemove(
                                onlineUser
                              );
                            }}
                            className="border-2 border-[#C9183E] px-3 py-2 font-mono text-xs font-semibold uppercase text-[#C9183E] hover:bg-[#C9183E] hover:text-[#F3EED8]"
                          >
                            REMOVE
                          </button>

                        </div>
                      )}

                  </div>
                );
              }
            )}

          </div>

          {isOwner && (
            <div className="mt-5 flex flex-col gap-4 border-t-2 border-[#171717] pt-5 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <p className="classification">
                  DANGER ZONE
                </p>

                <p className="mt-1 font-mono text-xs opacity-60">
                  Permanently delete this room and remove
                  access for all members.
                </p>
              </div>

              <button
                onClick={() => {
                  setDeleteRoomError("");
                  setMemberToDeleteRoom(true);
                }}
                className="border-2 border-[#C9183E] bg-[#C9183E] px-4 py-2 font-mono text-xs font-semibold uppercase text-[#F3EED8] hover:bg-[#171717]"
              >
                DELETE ROOM
              </button>

            </div>
          )}

        </div>
      )}

      {/* MAIN */}

      <main className="p-6">

        {!isOwner && (
          <div
            className={`mb-4 border-[3px] ${
              canEdit
                ? "border-green-700"
                : "border-[#C9183E]"
            } bg-[#E8E1C8] px-5 py-3`}
          >
            <p
              className={`font-mono text-sm font-semibold ${
                canEdit
                  ? "text-green-700"
                  : "text-[#C9183E]"
              }`}
            >
              {canEdit
                ? "EDITOR ACCESS — YOU CAN EDIT THE SHARED CODE."
                : "VIEW ONLY — THE CREATOR HAS NOT GRANTED YOU EDIT ACCESS."}
            </p>
          </div>
        )}

        {/* CODE EDITOR */}

        <div className="border-[3px] border-[#171717]">

          <div className="border-b-2 border-[#171717] bg-[#E8E1C8]">

            <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <p className="classification">
                  CODE EDITOR
                </p>

                <span className="font-mono text-xs">
                  {language.toUpperCase()}
                </span>

              </div>

              <p className="font-mono text-xs opacity-60">
                {isOwner
                  ? "AUTOSAVE ENABLED"
                  : canEdit
                  ? "EDITOR ACCESS"
                  : "READ ONLY"}
              </p>

            </div>

            {/* LIVE ACTIVITY */}

            <div className="border-t border-[#171717] px-5 py-2">

              {typingUsers.length > 0 ? (

                <div className="flex items-center gap-3">

                  <span className="flex items-center gap-1">

                    <span className="h-1.5 w-1.5 animate-pulse bg-[#C9183E]" />

                    <span className="h-1.5 w-1.5 animate-pulse bg-[#C9183E] [animation-delay:150ms]" />

                    <span className="h-1.5 w-1.5 animate-pulse bg-[#C9183E] [animation-delay:300ms]" />

                  </span>

                  <p className="font-mono text-xs font-semibold uppercase text-[#C9183E]">

                    {typingUsers.length === 1
                      ? `${typingUsers[0].name} is editing...`
                      : `${typingUsers
                          .map(
                            (typingUser) =>
                              typingUser.name
                          )
                          .join(", ")} are editing...`}

                  </p>

                </div>

              ) : (

                <p className="font-mono text-[10px] uppercase tracking-wider opacity-40">
                  LIVE ACTIVITY / NO ACTIVE EDITING
                </p>

              )}

            </div>

          </div>

          <Editor
            height="55vh"
            language={language}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              readOnly: !canEdit,
              minimap: {
                enabled: false,
              },
              fontSize: 15,
              automaticLayout: true,
              padding: {
                top: 20,
                bottom: 20,
              },
              cursorStyle: canEdit
                ? "line"
                : "block",
              domReadOnly: !canEdit,
            }}
          />

        </div>

        {/* OUTPUT */}

        <div className="mt-6 border-[3px] border-[#171717]">

          <div className="flex items-center justify-between border-b-2 border-[#171717] bg-[#E8E1C8] px-5 py-3">

            <p className="classification">
              EXECUTION OUTPUT
            </p>

            {(output || executionError) && (
              <button
                onClick={clearOutput}
                className="border-2 border-[#171717] px-3 py-1 font-mono text-xs font-semibold hover:bg-[#171717] hover:text-[#F3EED8]"
              >
                CLEAR
              </button>
            )}

          </div>

          <div className="min-h-[180px] bg-[#171717] p-5 font-mono text-sm text-[#F3EED8]">

            {!output &&
              !executionError &&
              !isRunning && (
                <p className="opacity-50">
                  Run your code to see the output here.
                </p>
              )}

            {isRunning && (
              <p className="opacity-60">
                Executing code in secure Docker sandbox...
              </p>
            )}

            {output && (
              <pre className="whitespace-pre-wrap">
                {output}
              </pre>
            )}

            {executionError && (
              <pre className="mt-3 whitespace-pre-wrap text-[#ff8a9f]">
                {executionError}
              </pre>
            )}

          </div>

        </div>

        {/* EXECUTION HISTORY TOGGLE */}

        <div className="mt-6 flex flex-col gap-4 border-[3px] border-[#171717] bg-[#E8E1C8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="classification">
              EXECUTION HISTORY
            </p>

            <p className="mt-1 font-mono text-xs opacity-60">
              VIEW YOUR RECENT CODE EXECUTIONS
            </p>
          </div>

          <button
            onClick={() =>
              setShowExecutionHistory(
                (current) => !current
              )
            }
            className="border-2 border-[#171717] bg-[#F3EED8] px-4 py-2 font-mono text-xs font-semibold uppercase hover:bg-[#171717] hover:text-[#F3EED8]"
          >
            {showExecutionHistory
              ? "HIDE EXECUTION HISTORY"
              : "SHOW EXECUTION HISTORY"}
          </button>

        </div>

        {/* EXECUTION HISTORY */}

        {showExecutionHistory && (
          <div className="mt-6 border-[3px] border-[#171717]">

            <div className="flex flex-col gap-3 border-b-2 border-[#171717] bg-[#E8E1C8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="classification">
                  EXECUTION HISTORY
                </p>

                <p className="mt-1 font-mono text-xs opacity-60">
                  LATEST 50 EXECUTIONS
                </p>
              </div>

              <button
                onClick={loadExecutionHistory}
                className="border-2 border-[#171717] px-3 py-2 font-mono text-xs font-semibold uppercase hover:bg-[#171717] hover:text-[#F3EED8]"
              >
                REFRESH
              </button>

            </div>

            {historyLoading && (
              <div className="px-5 py-10 text-center">
                <p className="font-mono text-sm opacity-60">
                  Loading execution history...
                </p>
              </div>
            )}

            {!historyLoading && historyError && (
              <div className="border-b-2 border-[#171717] px-5 py-6">
                <p className="font-mono text-sm font-semibold text-[#C9183E]">
                  {historyError}
                </p>
              </div>
            )}

            {!historyLoading &&
              !historyError &&
              executionHistory.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <p className="font-mono text-sm opacity-50">
                    No executions recorded yet.
                  </p>
                </div>
              )}

            {!historyLoading &&
              executionHistory.length > 0 && (
                <div>

                  {executionHistory.map(
                    (execution, index) => {

                      const isSuccess =
                        execution.status === "success";

                      return (
                        <div
                          key={
                            execution._id ||
                            index
                          }
                          className="border-b-2 border-[#171717] px-5 py-5 last:border-b-0"
                        >

                          <div className="flex flex-wrap items-start justify-between gap-4">

                            <div className="flex flex-wrap items-center gap-4">

                              <span
                                className={`border-2 px-3 py-1 font-mono text-xs font-semibold uppercase ${
                                  isSuccess
                                    ? "border-green-700 text-green-700"
                                    : "border-[#C9183E] text-[#C9183E]"
                                }`}
                              >
                                {isSuccess
                                  ? "✓ SUCCESS"
                                  : "✕ ERROR"}
                              </span>

                              <span className="font-mono text-sm font-semibold uppercase">
                                {execution.language}
                              </span>

                              <span className="font-mono text-xs opacity-60">
                                {execution.executionTime ?? 0} ms
                              </span>

                            </div>

                            <p className="font-mono text-xs opacity-60">
                              {formatDate(
                                execution.createdAt
                              )}
                            </p>

                          </div>

                          <div className="mt-3">

                            <p className="font-mono text-xs uppercase opacity-50">
                              EXECUTED BY
                            </p>

                            <p className="mt-1 font-mono text-sm font-semibold">
                              {execution.user?.name ||
                                "Unknown User"}
                            </p>

                          </div>

                          {execution.output && (
                            <div className="mt-4">

                              <p className="classification mb-2">
                                OUTPUT
                              </p>

                              <pre className="whitespace-pre-wrap border-2 border-[#171717] bg-[#171717] p-4 font-mono text-sm text-[#F3EED8]">
                                {execution.output}
                              </pre>

                            </div>
                          )}

                          {execution.error && (
                            <div className="mt-4">

                              <p className="classification mb-2 text-[#C9183E]">
                                ERROR
                              </p>

                              <pre className="whitespace-pre-wrap border-2 border-[#C9183E] bg-[#E8E1C8] p-4 font-mono text-sm text-[#C9183E]">
                                {execution.error}
                              </pre>

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>
              )}

          </div>
        )}

      </main>

      {/* REMOVE MEMBER MODAL */}

      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">

          <div className="w-full max-w-lg border-[3px] border-[#171717] bg-[#F3EED8] shadow-[10px_10px_0_#171717]">

            <div className="border-b-[3px] border-[#171717] bg-[#E8E1C8] px-6 py-5">

              <p className="classification">
                CREATOR CONTROL
              </p>

              <h2 className="editorial-heading mt-2 text-3xl">
                Remove User?
              </h2>

            </div>

            <div className="px-6 py-6">

              <p className="font-mono text-sm">
                Remove{" "}
                <strong>
                  {memberToRemove.name}
                </strong>{" "}
                from this room?
              </p>

              <p className="mt-4 font-mono text-sm leading-6 opacity-70">
                Their edit access will also be revoked
                and their active socket connection will
                be disconnected.
              </p>

              {removeError && (
                <p className="mt-4 border-2 border-[#C9183E] px-4 py-3 font-mono text-sm font-semibold text-[#C9183E]">
                  {removeError}
                </p>
              )}

            </div>

            <div className="flex justify-end gap-3 border-t-2 border-[#171717] px-6 py-5">

              <button
                onClick={() => {
                  setMemberToRemove(null);
                  setRemoveError("");
                }}
                disabled={isRemovingMember}
                className="border-2 border-[#171717] px-5 py-2 font-mono text-sm font-semibold uppercase hover:bg-[#171717] hover:text-[#F3EED8]"
              >
                CANCEL
              </button>

              <button
                onClick={handleRemoveMember}
                disabled={isRemovingMember}
                className="border-2 border-[#C9183E] bg-[#C9183E] px-5 py-2 font-mono text-sm font-semibold uppercase text-[#F3EED8] hover:bg-[#171717] disabled:opacity-50"
              >
                {isRemovingMember
                  ? "REMOVING..."
                  : "CONFIRM REMOVE"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* DELETE ROOM MODAL */}

      {memberToDeleteRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">

          <div className="w-full max-w-lg border-[3px] border-[#171717] bg-[#F3EED8] shadow-[10px_10px_0_#171717]">

            <div className="border-b-[3px] border-[#171717] bg-[#C9183E] px-6 py-5 text-[#F3EED8]">

              <p className="classification">
                DANGER / IRREVERSIBLE ACTION
              </p>

              <h2 className="mt-2 font-serif text-3xl font-bold">
                Delete Room?
              </h2>

            </div>

            <div className="px-6 py-6">

              <p className="font-mono text-sm leading-6">
                This will permanently delete room{" "}
                <strong>{roomId}</strong>.
              </p>

              <p className="mt-4 font-mono text-sm leading-6 opacity-70">
                All members will immediately lose access
                and the room will no longer exist.
              </p>

              {deleteRoomError && (
                <p className="mt-4 border-2 border-[#C9183E] px-4 py-3 font-mono text-sm font-semibold text-[#C9183E]">
                  {deleteRoomError}
                </p>
              )}

            </div>

            <div className="flex justify-end gap-3 border-t-2 border-[#171717] px-6 py-5">

              <button
                onClick={() => {
                  setMemberToDeleteRoom(false);
                  setDeleteRoomError("");
                }}
                disabled={isDeletingRoom}
                className="border-2 border-[#171717] px-5 py-2 font-mono text-sm font-semibold uppercase hover:bg-[#171717] hover:text-[#F3EED8]"
              >
                CANCEL
              </button>

              <button
                onClick={handleDeleteRoom}
                disabled={isDeletingRoom}
                className="border-2 border-[#C9183E] bg-[#C9183E] px-5 py-2 font-mono text-sm font-semibold uppercase text-[#F3EED8] hover:bg-[#171717] disabled:opacity-50"
              >
                {isDeletingRoom
                  ? "DELETING..."
                  : "DELETE PERMANENTLY"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* LEAVE ROOM MODAL */}

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">

          <div className="w-full max-w-lg border-[3px] border-[#171717] bg-[#F3EED8] shadow-[10px_10px_0_#171717]">

            <div className="border-b-[3px] border-[#171717] bg-[#E8E1C8] px-6 py-5">

              <p className="classification">
                CODECOLLAB / ROOM ACTION
              </p>

              <h2 className="editorial-heading mt-2 text-3xl">
                Leave Room?
              </h2>

            </div>

            <div className="px-6 py-6">

              {isOwner ? (
                <div className="border-2 border-[#C9183E] bg-[#E8E1C8] px-4 py-4">

                  <p className="font-mono text-sm font-semibold text-[#C9183E]">
                    ROOM CREATOR CANNOT LEAVE
                  </p>

                  <p className="mt-2 font-mono text-sm leading-6">
                    Delete the room instead if you
                    no longer want to keep it.
                  </p>

                </div>
              ) : (
                <p className="font-mono text-sm leading-6">
                  You will be removed from this room
                  and will no longer have access to it.
                </p>
              )}

              {leaveError && (
                <p className="mt-4 border-2 border-[#C9183E] px-4 py-3 font-mono text-sm font-semibold text-[#C9183E]">
                  {leaveError}
                </p>
              )}

            </div>

            <div className="flex justify-end gap-3 border-t-2 border-[#171717] px-6 py-5">

              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  setLeaveError("");
                }}
                className="border-2 border-[#171717] px-5 py-2 font-mono text-sm font-semibold uppercase hover:bg-[#171717] hover:text-[#F3EED8]"
              >
                CANCEL
              </button>

              {!isOwner && (
                <button
                  onClick={handleLeaveRoom}
                  disabled={isLeaving}
                  className="border-2 border-[#C9183E] bg-[#C9183E] px-5 py-2 font-mono text-sm font-semibold uppercase text-[#F3EED8] hover:bg-[#171717] disabled:opacity-50"
                >
                  {isLeaving
                    ? "LEAVING..."
                    : "CONFIRM LEAVE"}
                </button>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default Room;
