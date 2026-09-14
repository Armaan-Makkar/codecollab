import { io } from "socket.io-client";

const socket = io("https://codecollab-jfwk.onrender.com", {
  autoConnect: false,
});

export default socket;