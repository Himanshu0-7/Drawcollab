import { useEffect, useRef, useState } from "react";
import Cursor from "./Cursor";
import { useNavigate } from "react-router-dom";

export function CreateRoom({ setCursors, wsRef }) {
  const roomIdRef = useRef(crypto.randomUUID());

  const url = `ws://localhost:3000/ws?room=${roomIdRef.current}`;
  const socket = new WebSocket(url);
  const ivRef = useRef(new Uint8Array(12));
  const cryptoKeyRef = useRef(null);

  const msgStr = "kadjfs";
  const createroomId = async () => {
    window.crypto.getRandomValues(ivRef.current);
    const encodedMsg = new TextEncoder().encode(msgStr);
    const webKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 128,
      },
      true,
      ["encrypt", "decrypt"]
    );
    const encrptedMsg = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: ivRef.current,
      },
      webKey,
      encodedMsg
    );
    const cypherBytes = new Uint16Array(encrptedMsg);
    const payload = new Uint16Array(ivRef.current.length + cypherBytes.length);
    payload.set(ivRef.current, 0);
    payload.set(cypherBytes, ivRef.current.length);
    await fetch(`http://localhost:3000/api/payload?room=${roomIdRef.current}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: payload.buffer,
    });

    // exporting webkey to jwk

    cryptoKeyRef.current = await window.crypto.subtle.exportKey("jwk", webKey);
    window.location.hash = `room=${roomIdRef.current},${cryptoKeyRef.current.k}`;
  };

  return (
    <>
      <button id="session-button" onClick={createroomId}>
        Start Session
      </button>
    </>
  );
}
