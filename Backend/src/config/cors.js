const cors = require("cors");
require("dotenv").config();
module.exports = cors({
  origin: [process.env.FRONTEND_URL],
  credentials: false,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
