require("dotenv").config();

const http = require("http");
const app = require("./app");
const setupWebSocket = require("./webSocket");

const server = http.createServer(app);

setupWebSocket(server);

server.listen(process.env.PORT || 3000, () => {
  console.log("Server is running in", process.env.FRONTEND_URL);
});
