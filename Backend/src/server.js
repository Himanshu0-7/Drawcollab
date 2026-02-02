require("dotenv").config();

const http = require("http");
const app = require("./app");
const setupWebSocket = require("./webSocket");

const server = http.createServer(app);

setupWebSocket(server);

server.listen(process.env.PORT, () => {
  console.log("Server is running in", console.log(process.env.ORIGIN_URL));
});
