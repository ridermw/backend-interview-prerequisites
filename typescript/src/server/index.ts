import { initializeHttp } from "./http";
import { initializeTcp } from "./tcp";
import { Logger } from "../utils/logger";

const app = initializeHttp();
const httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3033;
app.listen(httpPort, () => {
  Logger.info(
    `HTTP server is running at http://localhost:${httpPort}`,
    "http-server",
  );
});

const server = initializeTcp();
const tcpPort = process.env.TCP_PORT ? parseInt(process.env.TCP_PORT) : 8000;
server.listen(tcpPort, "localhost", () => {
  Logger.info(`TCP server is running at localhost:${tcpPort}`, "tcp-server");
});
