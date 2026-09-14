
import api from "./api";

// --------------------------------------------------
// CREATE ROOM
// --------------------------------------------------

export const createRoom = async (roomData) => {
  const response = await api.post(
    "/rooms",
    roomData
  );

  return response.data;
};

// --------------------------------------------------
// GET MY ROOMS
// --------------------------------------------------

export const getMyRooms = async () => {
  const response = await api.get(
    "/rooms/my-rooms"
  );

  return response.data;
};

// --------------------------------------------------
// GET ROOM
// --------------------------------------------------

export const getRoom = async (roomId) => {
  const response = await api.get(
    `/rooms/${roomId}`
  );

  return response.data;
};

// --------------------------------------------------
// JOIN ROOM
// --------------------------------------------------

export const joinRoom = async (roomId) => {
  const response = await api.post(
    `/rooms/${roomId}/join`
  );

  return response.data;
};

// --------------------------------------------------
// UPDATE ROOM CODE
// --------------------------------------------------

export const updateRoomCode = async (
  roomId,
  roomData
) => {
  const response = await api.put(
    `/rooms/${roomId}/code`,
    roomData
  );

  return response.data;
};

// --------------------------------------------------
// LEAVE ROOM
// --------------------------------------------------

export const leaveRoom = async (roomId) => {
  const response = await api.delete(
    `/rooms/${roomId}/leave`
  );

  return response.data;
};

// --------------------------------------------------
// REMOVE MEMBER
// --------------------------------------------------

export const removeMember = async (
  roomId,
  userId
) => {
  const response = await api.delete(
    `/rooms/${roomId}/members/${userId}`
  );

  return response.data;
};

// --------------------------------------------------
// GRANT EDIT ACCESS
// --------------------------------------------------

export const grantEditAccess = async (
  roomId,
  userId
) => {
  const response = await api.put(
    `/rooms/${roomId}/members/${userId}/edit`
  );

  return response.data;
};

// --------------------------------------------------
// REVOKE EDIT ACCESS
// --------------------------------------------------

export const revokeEditAccess = async (
  roomId,
  userId
) => {
  const response = await api.delete(
    `/rooms/${roomId}/members/${userId}/edit`
  );

  return response.data;
};

// --------------------------------------------------
// DELETE ROOM
// --------------------------------------------------

export const deleteRoom = async (
  roomId
) => {
  const response = await api.delete(
    `/rooms/${roomId}`
  );

  return response.data;
};

