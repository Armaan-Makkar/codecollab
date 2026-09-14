
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createRoom,
  joinRoom,
  getMyRooms,
  deleteRoom,
} from "../services/roomService";

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // --------------------------------------------------
  // ROOM STATE
  // --------------------------------------------------

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // --------------------------------------------------
  // CREATE ROOM STATE
  // --------------------------------------------------

  const [showCreateRoom, setShowCreateRoom] =
    useState(false);

  const [roomName, setRoomName] = useState("");
  const [language, setLanguage] =
    useState("javascript");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // JOIN ROOM STATE
  // --------------------------------------------------

  const [showJoinRoom, setShowJoinRoom] =
    useState(false);

  const [joinRoomId, setJoinRoomId] =
    useState("");

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // --------------------------------------------------
  // DELETE ROOM STATE
  // --------------------------------------------------

  const [roomToDelete, setRoomToDelete] =
    useState(null);

  const [deleting, setDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  // --------------------------------------------------
  // LOAD ROOMS
  // --------------------------------------------------

  const loadRooms = async () => {
    try {
      setRoomsLoading(true);
      setRoomsError("");

      const data = await getMyRooms();

      setRooms(data.rooms || []);
    } catch (error) {
      console.error(
        "Load rooms error:",
        error
      );

      setRoomsError(
        error.response?.data?.message ||
          "Failed to load your rooms."
      );
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // --------------------------------------------------
  // CREATE ROOM
  // --------------------------------------------------

  const handleCreateRoom = async (e) => {
    e.preventDefault();

    if (!roomName.trim()) {
      setError(
        "Room name is required."
      );
      return;
    }

    try {
      setCreating(true);
      setError("");

      const data = await createRoom({
        name: roomName.trim(),
        language,
      });

      setRoomName("");
      setLanguage("javascript");
      setShowCreateRoom(false);

      navigate(
        `/room/${data.room.roomId}`
      );
    } catch (error) {
      console.error(
        "Create room error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to create room."
      );
    } finally {
      setCreating(false);
    }
  };

  // --------------------------------------------------
  // JOIN ROOM
  // --------------------------------------------------

  const handleJoinRoom = async (e) => {
    e.preventDefault();

    if (!joinRoomId.trim()) {
      setJoinError(
        "Room ID is required."
      );
      return;
    }

    try {
      setJoining(true);
      setJoinError("");

      const data = await joinRoom(
        joinRoomId.trim()
      );

      setShowJoinRoom(false);
      setJoinRoomId("");

      navigate(
        `/room/${data.room.roomId}`
      );
    } catch (error) {
      console.error(
        "Join room error:",
        error
      );

      setJoinError(
        error.response?.data?.message ||
          "Failed to join room."
      );
    } finally {
      setJoining(false);
    }
  };

  // --------------------------------------------------
  // DELETE ROOM
  // --------------------------------------------------

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteRoom(
        roomToDelete.roomId
      );

      setRooms((currentRooms) =>
        currentRooms.filter(
          (room) =>
            room.roomId !==
            roomToDelete.roomId
        )
      );

      setRoomToDelete(null);
    } catch (error) {
      console.error(
        "Delete room error:",
        error
      );

      setDeleteError(
        error.response?.data?.message ||
          "Failed to delete room."
      );
    } finally {
      setDeleting(false);
    }
  };

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredRooms = useMemo(() => {
    const query =
      searchQuery
        .trim()
        .toLowerCase();

    if (!query) {
      return rooms;
    }

    return rooms.filter((room) => {
      const name =
        room.name?.toLowerCase() || "";

      const roomId =
        room.roomId?.toLowerCase() || "";

      const language =
        room.language?.toLowerCase() || "";

      const owner =
        room.owner?.name
          ?.toLowerCase() || "";

      return (
        name.includes(query) ||
        roomId.includes(query) ||
        language.includes(query) ||
        owner.includes(query)
      );
    });
  }, [rooms, searchQuery]);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatLanguage = (value) => {
    const languages = {
      javascript: "JAVASCRIPT",
      python: "PYTHON",
      cpp: "C++",
      java: "JAVA",
    };

    return (
      languages[value] ||
      value?.toUpperCase() ||
      "UNKNOWN"
    );
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(
      date
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const isOwner = (room) => {
    return (
      room.owner?._id ===
        user?.id ||
      room.owner?._id ===
        user?._id
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#F3EED8] text-[#171717]">

      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}

      <header className="border-b-[3px] border-[#171717] px-6 py-5">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">

          <div>
            <p className="classification">
              CODECOLLAB / SYSTEM
            </p>

            <h1 className="editorial-title mt-1 text-3xl font-bold">
              Dashboard
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="brutalist-button"
          >
            LOG OUT
          </button>

        </div>

      </header>

      {/* ============================================= */}
      {/* MAIN */}
      {/* ============================================= */}

      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* =========================================== */}
        {/* USER PANEL */}
        {/* =========================================== */}

        <section className="mb-10 border-[3px] border-[#171717] bg-[#E8E1C8] p-6 shadow-[5px_5px_0_#171717]">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <p className="classification mb-4">
                USER / AUTHENTICATED
              </p>

              <h2 className="editorial-heading text-4xl font-bold">
                Welcome
                {user?.name
                  ? `, ${user.name}`
                  : ""}
              </h2>

              <p className="mt-3 font-mono text-sm text-[#716F62]">
                {user?.email ||
                  "Authenticated user"}
              </p>

            </div>

            <div className="border-2 border-[#171717] bg-[#F3EED8] px-4 py-3">

              <p className="classification">
                SESSION
              </p>

              <p className="mt-1 font-mono text-sm font-bold">
                ACTIVE
              </p>

            </div>

          </div>

        </section>

        {/* =========================================== */}
        {/* QUICK ACTIONS */}
        {/* =========================================== */}

        <section className="mb-10">

          <div className="mb-5 flex items-end justify-between gap-4">

            <div>

              <p className="classification">
                WORKSPACE / ACTIONS
              </p>

              <h2 className="editorial-heading mt-2 text-3xl font-bold">
                Start Working
              </h2>

            </div>

          </div>

          <div className="grid gap-5 md:grid-cols-3">

            {/* CREATE */}

            <button
              onClick={() => {
                setShowCreateRoom(true);
                setError("");
              }}
              className="group border-[3px] border-[#171717] bg-[#C9183E] p-6 text-left text-[#F3EED8] shadow-[5px_5px_0_#171717] transition-transform hover:-translate-x-1 hover:-translate-y-1"
            >

              <p className="font-mono text-xs uppercase tracking-widest">
                01 / CREATE
              </p>

              <h3 className="editorial-heading mt-4 text-3xl font-bold">
                New Room
              </h3>

              <p className="mt-3 font-mono text-sm">
                Start a collaborative coding session.
              </p>

              <div className="mt-6 font-mono text-sm font-bold">
                CREATE ROOM →
              </div>

            </button>

            {/* JOIN */}

            <button
              onClick={() => {
                setShowJoinRoom(true);
                setJoinError("");
              }}
              className="group border-[3px] border-[#171717] bg-[#F3EED8] p-6 text-left shadow-[5px_5px_0_#171717] transition-transform hover:-translate-x-1 hover:-translate-y-1"
            >

              <p className="font-mono text-xs uppercase tracking-widest">
                02 / JOIN
              </p>

              <h3 className="editorial-heading mt-4 text-3xl font-bold">
                Existing Room
              </h3>

              <p className="mt-3 font-mono text-sm text-[#716F62]">
                Enter a room ID and join collaborators.
              </p>

              <div className="mt-6 font-mono text-sm font-bold">
                JOIN ROOM →
              </div>

            </button>

            {/* EXECUTOR */}

            <div className="border-[3px] border-[#171717] bg-[#E8E1C8] p-6">

              <p className="font-mono text-xs uppercase tracking-widest">
                03 / EXECUTOR
              </p>

              <h3 className="editorial-heading mt-4 text-3xl font-bold">
                Code Runner
              </h3>

              <p className="mt-3 font-mono text-sm text-[#716F62]">
                Isolated multi-language execution environment.
              </p>

              <div className="mt-6 font-mono text-xs uppercase">
                AVAILABLE INSIDE ROOMS
              </div>

            </div>

          </div>

        </section>

        {/* =========================================== */}
        {/* MY ROOMS */}
        {/* =========================================== */}

        <section>

          <div className="mb-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <p className="classification">
                WORKSPACE / ROOMS
              </p>

              <div className="mt-2 flex items-center gap-4">

                <h2 className="editorial-heading text-3xl font-bold">
                  My Rooms
                </h2>

                <span className="border-2 border-[#171717] px-2 py-1 font-mono text-xs font-bold">
                  {rooms.length}
                </span>

              </div>

            </div>

            {/* SEARCH */}

            <div className="w-full md:max-w-sm">

              <label className="classification mb-2 block">
                SEARCH
              </label>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                placeholder="ROOM / ID / LANGUAGE"
                className="archival-input"
              />

            </div>

          </div>

          {/* ROOM ERROR */}

          {roomsError && (
            <div className="mb-5 border-2 border-[#C9183E] p-4 font-mono text-sm">

              <div className="classification mb-1 text-[#C9183E]">
                ERROR
              </div>

              {roomsError}

              <button
                onClick={loadRooms}
                className="ml-4 underline"
              >
                RETRY
              </button>

            </div>
          )}

          {/* LOADING */}

          {roomsLoading ? (
            <div className="border-[3px] border-[#171717] p-10 text-center">

              <p className="font-mono text-sm uppercase tracking-widest">
                LOADING ROOMS...
              </p>

            </div>
          ) : filteredRooms.length === 0 ? (

            /* EMPTY STATE */

            <div className="border-[3px] border-dashed border-[#171717] p-12 text-center">

              <p className="classification text-[#C9183E]">
                {searchQuery
                  ? "SEARCH / NO RESULTS"
                  : "ROOMS / EMPTY"}
              </p>

              <h3 className="editorial-heading mt-4 text-3xl font-bold">
                {searchQuery
                  ? "No matching rooms"
                  : "No coding rooms yet"}
              </h3>

              <p className="mx-auto mt-3 max-w-lg font-mono text-sm text-[#716F62]">
                {searchQuery
                  ? "Try another room name, room ID, language, or owner."
                  : "Create your first room or join an existing collaborative session."}
              </p>

              {!searchQuery && (
                <button
                  onClick={() => {
                    setShowCreateRoom(true);
                    setError("");
                  }}
                  className="brutalist-button mt-6"
                >
                  CREATE FIRST ROOM →
                </button>
              )}

            </div>

          ) : (

            /* ROOM LIST */

            <div className="space-y-4">

              {filteredRooms.map((room, index) => {

                const owner =
                  isOwner(room);

                return (
                  <article
                    key={room._id || room.roomId}
                    className="border-[3px] border-[#171717] bg-[#F3EED8] shadow-[4px_4px_0_#171717]"
                  >

                    <div className="grid md:grid-cols-[80px_1.5fr_1fr_1fr_160px]">

                      {/* INDEX */}

                      <div className="border-b-[3px] border-[#171717] p-5 md:border-b-0 md:border-r-[3px]">

                        <p className="font-mono text-xs text-[#716F62]">
                          ROOM
                        </p>

                        <p className="mt-2 font-mono text-2xl font-bold">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </p>

                      </div>

                      {/* ROOM */}

                      <div className="border-b-[3px] border-[#171717] p-5 md:border-b-0 md:border-r-[3px]">

                        <p className="classification">
                          ROOM NAME
                        </p>

                        <h3 className="editorial-heading mt-2 break-words text-2xl font-bold">
                          {room.name}
                        </h3>

                        <p className="mt-2 font-mono text-xs text-[#716F62]">
                          ID:{" "}
                          <span className="font-bold">
                            {room.roomId}
                          </span>
                        </p>

                      </div>

                      {/* DETAILS */}

                      <div className="border-b-[3px] border-[#171717] p-5 md:border-b-0 md:border-r-[3px]">

                        <p className="classification">
                          LANGUAGE
                        </p>

                        <p className="mt-2 font-mono text-sm font-bold">
                          {formatLanguage(
                            room.language
                          )}
                        </p>

                        <p className="mt-4 classification">
                          MEMBERS
                        </p>

                        <p className="mt-1 font-mono text-sm font-bold">
                          {room.members?.length ||
                            0}{" "}
                          ACTIVE
                        </p>

                      </div>

                      {/* OWNER / UPDATED */}

                      <div className="border-b-[3px] border-[#171717] p-5 md:border-b-0 md:border-r-[3px]">

                        <p className="classification">
                          OWNER
                        </p>

                        <p className="mt-2 truncate font-mono text-sm font-bold">
                          {room.owner?.name ||
                            "Unknown"}
                        </p>

                        <p className="mt-4 classification">
                          UPDATED
                        </p>

                        <p className="mt-1 font-mono text-xs">
                          {formatDate(
                            room.updatedAt
                          )}
                        </p>

                      </div>

                      {/* ACTIONS */}

                      <div className="flex flex-col gap-2 p-4">

                        <button
                          onClick={() =>
                            navigate(
                              `/room/${room.roomId}`
                            )
                          }
                          className="brutalist-button w-full"
                        >
                          OPEN ROOM →
                        </button>

                        {owner && (
                          <button
                            onClick={() => {
                              setDeleteError("");
                              setRoomToDelete(
                                room
                              );
                            }}
                            className="w-full border-2 border-[#C9183E] px-3 py-2 font-mono text-xs font-bold uppercase text-[#C9183E] hover:bg-[#C9183E] hover:text-[#F3EED8]"
                          >
                            DELETE
                          </button>
                        )}

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>
          )}

        </section>

        {/* =========================================== */}
        {/* SYSTEM STATUS */}
        {/* =========================================== */}

        <section className="mt-12 border-t-[3px] border-[#171717] pt-5">

          <div className="flex flex-wrap gap-6 font-mono text-xs uppercase">

            <span>
              SYSTEM:{" "}
              <strong className="text-[#C9183E]">
                ONLINE
              </strong>
            </span>

            <span>
              AUTH:{" "}
              <strong className="text-[#C9183E]">
                ACTIVE
              </strong>
            </span>

            <span>
              API:{" "}
              <strong className="text-[#C9183E]">
                CONNECTED
              </strong>
            </span>

            <span>
              ROOMS:{" "}
              <strong className="text-[#C9183E]">
                {rooms.length}
              </strong>
            </span>

          </div>

        </section>

      </main>

      {/* ============================================= */}
      {/* CREATE ROOM MODAL */}
      {/* ============================================= */}

      {showCreateRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/70 px-5">

          <div className="w-full max-w-xl border-[3px] border-[#171717] bg-[#F3EED8] shadow-[7px_7px_0_#C9183E]">

            <div className="flex items-center justify-between border-b-[3px] border-[#171717] p-6">

              <div>

                <p className="classification text-[#C9183E]">
                  ROOM / CREATE-01
                </p>

                <h2 className="editorial-heading mt-2 text-3xl font-bold">
                  New Coding Room
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowCreateRoom(false)
                }
                className="border-2 border-[#171717] px-3 py-2 font-mono text-sm font-bold hover:bg-[#171717] hover:text-[#F3EED8]"
              >
                X
              </button>

            </div>

            <form
              onSubmit={
                handleCreateRoom
              }
              className="space-y-6 p-6"
            >

              <div>

                <label className="classification mb-2 block">
                  ROOM NAME
                </label>

                <input
                  type="text"
                  value={roomName}
                  onChange={(e) =>
                    setRoomName(
                      e.target.value
                    )
                  }
                  placeholder="MY FIRST ROOM"
                  className="archival-input"
                  autoFocus
                />

              </div>

              <div>

                <label className="classification mb-2 block">
                  PROGRAMMING LANGUAGE
                </label>

                <select
                  value={language}
                  onChange={(e) =>
                    setLanguage(
                      e.target.value
                    )
                  }
                  className="archival-input"
                >

                  <option value="javascript">
                    JavaScript
                  </option>

                  <option value="python">
                    Python
                  </option>

                  <option value="cpp">
                    C++
                  </option>

                  <option value="java">
                    Java
                  </option>

                </select>

              </div>

              {error && (
                <div className="border-2 border-[#C9183E] p-4 font-mono text-sm">

                  <div className="classification mb-1 text-[#C9183E]">
                    ERROR
                  </div>

                  {error}

                </div>
              )}

              <div className="flex gap-3 border-t-2 border-[#171717] pt-6">

                <button
                  type="button"
                  onClick={() =>
                    setShowCreateRoom(false)
                  }
                  className="brutalist-button"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="brutalist-button flex-1"
                >
                  {creating
                    ? "CREATING..."
                    : "CREATE ROOM →"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ============================================= */}
      {/* JOIN ROOM MODAL */}
      {/* ============================================= */}

      {showJoinRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/70 px-5">

          <div className="w-full max-w-xl border-[3px] border-[#171717] bg-[#F3EED8] shadow-[7px_7px_0_#C9183E]">

            <div className="flex items-center justify-between border-b-[3px] border-[#171717] p-6">

              <div>

                <p className="classification text-[#C9183E]">
                  ROOM / JOIN-01
                </p>

                <h2 className="editorial-heading mt-2 text-3xl font-bold">
                  Join Coding Room
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowJoinRoom(false)
                }
                className="border-2 border-[#171717] px-3 py-2 font-mono text-sm font-bold hover:bg-[#171717] hover:text-[#F3EED8]"
              >
                X
              </button>

            </div>

            <form
              onSubmit={handleJoinRoom}
              className="space-y-6 p-6"
            >

              <div>

                <label className="classification mb-2 block">
                  ROOM ID
                </label>

                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) =>
                    setJoinRoomId(
                      e.target.value
                    )
                  }
                  placeholder="75B78D75"
                  className="archival-input"
                  autoFocus
                />

              </div>

              {joinError && (
                <div className="border-2 border-[#C9183E] p-4 font-mono text-sm">

                  <div className="classification mb-1 text-[#C9183E]">
                    ERROR
                  </div>

                  {joinError}

                </div>
              )}

              <div className="flex gap-3 border-t-2 border-[#171717] pt-6">

                <button
                  type="button"
                  onClick={() =>
                    setShowJoinRoom(false)
                  }
                  className="brutalist-button"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={joining}
                  className="brutalist-button flex-1"
                >
                  {joining
                    ? "JOINING..."
                    : "JOIN ROOM →"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ============================================= */}
      {/* DELETE ROOM MODAL */}
      {/* ============================================= */}

      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/80 px-5">

          <div className="w-full max-w-lg border-[3px] border-[#171717] bg-[#F3EED8] shadow-[7px_7px_0_#C9183E]">

            <div className="border-b-[3px] border-[#171717] p-6">

              <p className="classification text-[#C9183E]">
                DANGER / DELETE-01
              </p>

              <h2 className="editorial-heading mt-2 text-3xl font-bold">
                Delete Room?
              </h2>

            </div>

            <div className="space-y-5 p-6">

              <div className="border-2 border-[#171717] bg-[#E8E1C8] p-4">

                <p className="classification">
                  ROOM
                </p>

                <p className="mt-2 font-mono text-lg font-bold">
                  {roomToDelete.name}
                </p>

                <p className="mt-1 font-mono text-xs text-[#716F62]">
                  ID:{" "}
                  {roomToDelete.roomId}
                </p>

              </div>

              <p className="font-mono text-sm leading-6">
                This action permanently deletes the room and its saved code. All collaborators will lose access.
              </p>

              {deleteError && (
                <div className="border-2 border-[#C9183E] p-4 font-mono text-sm">

                  <div className="classification mb-1 text-[#C9183E]">
                    ERROR
                  </div>

                  {deleteError}

                </div>
              )}

              <div className="flex gap-3 border-t-2 border-[#171717] pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setRoomToDelete(null)
                  }
                  className="brutalist-button"
                  disabled={deleting}
                >
                  CANCEL
                </button>

                <button
                  type="button"
                  onClick={handleDeleteRoom}
                  disabled={deleting}
                  className="flex-1 border-2 border-[#C9183E] bg-[#C9183E] px-4 py-3 font-mono text-sm font-bold text-[#F3EED8] shadow-[3px_3px_0_#171717] hover:shadow-none disabled:opacity-60"
                >
                  {deleting
                    ? "DELETING..."
                    : "DELETE ROOM"}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ============================================= */}
      {/* FOOTER */}
      {/* ============================================= */}

      <footer className="border-t-2 border-[#171717] px-6 py-3">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] md:flex-row">

          <span>
            CODECOLLAB / DIGITAL WORKSPACE
          </span>

          <span>
            ROOM SYSTEM ACTIVE
          </span>

          <span>
            EST. 2026
          </span>

        </div>

      </footer>

    </div>
  );
}

export default Dashboard;

