const roomPayloads = new Map();
module.exports = {
  set(roomId, frame) {
    roomPayloads.set(roomId, frame);
  },
  get(roomId) {
    return roomPayloads.get(roomId);
  },
  // has(roomId) {
  //   return roomPayloads.has(roomId);
  // },

  // delete(roomId) {
  //   roomPayloads.delete(roomId);
  // },
};
