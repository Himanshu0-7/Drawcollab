const express = require("express");
const cors = require("./config/cors");
const routes = require("./routes");

const app = express();

app.use(cors);
app.use(
  express.raw({
    type: "application/octet-stream",
    limit: "50mb",
  }),
);
app.use(express.json());
app.use("/api", routes);

module.exports = app;
