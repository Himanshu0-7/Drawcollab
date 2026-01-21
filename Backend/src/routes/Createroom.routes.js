const express = require("express");
const router = express.Router();
const roomFrames = require("../roomFrames");
const buildFrame = require("../buildFrame");

router.post("/payload", (req, res) => {
  const roomId = req.query.room;
  if (!roomId) {
    return res.status(400).json({ error: "room missing" });
  }
  const encryptedBlob = req.body;

  const frame = buildFrame({
    type: "SCENE_UPDATE",
    encryptedData: encryptedBlob,
  });
  roomFrames.set(roomId, frame);

  res.status(200).json({ ok: true });
});
module.exports = router;
