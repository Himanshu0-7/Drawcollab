// utils/buildFrame.js
function buildFrame({ type, encryptedData }) {
  const header = { type };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));

  const buffer = new ArrayBuffer(
    4 + headerBytes.byteLength + encryptedData.byteLength,
  );

  const view = new DataView(buffer);
  view.setUint32(0, headerBytes.byteLength);

  let offset = 4;
  new Uint8Array(buffer, offset, headerBytes.byteLength).set(headerBytes);

  offset += headerBytes.byteLength;
  new Uint8Array(buffer, offset).set(encryptedData);

  return buffer;
}

module.exports = buildFrame;
