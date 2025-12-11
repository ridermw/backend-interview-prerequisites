import { createServer, Server } from "net";
import { Logger } from "../utils/logger";

export function initializeTcp(): Server {
  const server = createServer();

  server.on("connection", (socket) => {
    if (!socket.remotePort) {
      return;
    }

    function writeResponse(ok: boolean, res: object) {
      socket.write(
        JSON.stringify({
          ok,
          ...res,
        }) + "\n\n",
      );
    }

    Logger.debug(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`, "tcp");

    socket.on("data", (data) => {
      if (!socket.remotePort) {
        return;
      }
      Logger.debug(`Data received from ${socket.remoteAddress}`, "tcp", { data: data.toString() });

      const requests = data.toString("utf8").trim().split("\n");
      for (const rawRequest of requests) {
        try {
          const req = JSON.parse(rawRequest);
          switch (req.type) {
            case "hello.get":
            case "hello.post":
              writeResponse(true, { msg: "hello", req });
              break;
            default:
              writeResponse(false, { error: "unknown_type" });
          }
        } catch (e) {
          Logger.error("Failed to process TCP request", "tcp", e);
          writeResponse(false, { error: "unknown_error", error_detail: e });
        }
      }
    });

    // Add a 'close' event handler to this instance of socket
    socket.on("close", () => {
      if (!socket.remotePort) {
        return;
      }
      Logger.debug(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`, "tcp");
    });
  });
  return server;
}
