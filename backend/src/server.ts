import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { registerSocketHandlers } from "./socket/index.js";

async function bootstrap() {
  await connectDatabase();
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true }
  });

  registerSocketHandlers(io);

  server.listen(env.PORT, () => {
    console.log(`API and Socket.io server running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
