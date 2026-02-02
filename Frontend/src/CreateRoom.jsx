import { useRef } from "react";

export function CreateRoom({
  setEncrptionKey,
  onStartSession,
  sessionStatus,
  setSessionStatus,
}) {
  const roomIdRef = useRef(crypto.randomUUID());

  /*____________________________________
  
        Handling SessionStatus & RoomId 
        
  ______________________________________*/

  const startSession = async () => {
    onStartSession();
    const cryptoKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 128,
      },
      true,
      ["encrypt", "decrypt"],
    );
    const jwk = await window.crypto.subtle.exportKey("jwk", cryptoKey);

    window.location.hash = `#room=${roomIdRef.current},${jwk.k}`;
    setEncrptionKey(jwk);
    setSessionStatus(true);

    // exporting webkey to jwk
  };
  const stopSession = () => {
    window.location.hash = "";
    setSessionStatus(false);
  };

  return (
    <>
      <button
        className={sessionStatus ? "stop-session" : "start-session"}
        onClick={sessionStatus ? stopSession : startSession}
      >
        {sessionStatus ? "Stop Session" : "Start Session"}
      </button>
    </>
  );
}
