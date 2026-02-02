import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import Session from "./Session";
import Canvas from "./Canvas";
import EraserCursor from "./EraserCursor";
import "./Shared.css";
const adjectives = [
  "Blue", "Neon", "Silent", "Swift", "Pixel", "Cosmic", "Fuzzy",
];

const animals = [
  "Panda", "Fox", "Tiger", "Owl", "Wolf", "Koala", "Hawk",
];

function generateUsername() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj} ${animal} ${num}`;
}
function App() {
  const [isshare, setIshare] = useState(0);
  const [ActiveTool, setActiveTool] = useState("selection");
  const [isEraserEnable, setIsEraserEnable] = useState(false);
  const [pointerEvent, setPointerEvent] = useState("");
  const [roomInfo, setRoomInfo] = useState(null);
  const [encryptionKey, setEncrptionKey] = useState(null);
  const [userName, setUserName] = useState('');
  const [sessionStatus, setSessionStatus] = useState(false)
  const fileRef = useRef(null);
  const handleStartSession = () => {
    if (!userName) {
      setUserName(generateUsername());
    }
  };
  useEffect(() => {
    localStorage.setItem("userName", userName);
  }, [userName]);
  const handleUploadClick = () => {
    fileRef.current.click();
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const img = new window.Image();
    img.src = url;

    img.onload = () => {
      setActiveTool({
        type: "image",
        payload: {
          src: url,
          width: img.width,
          height: img.height,
        },
      });
    };
  };


  const shareBtn = () => {
    setIshare((prev) => (prev === 0 ? 1 : 0));
  };

  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#room=")) {
        setRoomInfo(null);
        setEncrptionKey(null); // Clear key too
        return;
      }
      const [, value] = hash.split("#room=");
      const [roomId, key] = value.split(",");
      if (!roomId || !key) {
        setRoomInfo(null);
        setEncrptionKey(null);
        setSessionStatus(sessionStatus)
        return;
      }
      setRoomInfo({ roomId, key });

      // 👇 ADD THIS: Reconstruct the JWK from the hash
      setUserName(generateUsername())
      setEncrptionKey({
        kty: "oct",
        k: key,
        alg: "A128GCM",
        ext: true,
      });
      setSessionStatus(true)
    };
    parseHash();
    window.addEventListener("hashchange", parseHash);
    return () => {
      window.removeEventListener("hashchange", parseHash);
    };
  }, []);

  return (
    <>
      <Navbar
        shareBtn={shareBtn}
        setActiveTool={setActiveTool}
        ActiveTool={ActiveTool}
        pointerEvent={pointerEvent}
        fileRef={fileRef}
        handleUploadClick={handleUploadClick}
        handleFileChange={handleFileChange}
      ></Navbar>
      <EraserCursor isEraserEnable={isEraserEnable} />
      <Canvas
        ActiveTool={ActiveTool}
        setActiveTool={setActiveTool}
        setPointerEvent={setPointerEvent}
        setIsEraserEnable={setIsEraserEnable}
        roomInfo={roomInfo}
        encryptionKey={encryptionKey}
        userName={userName}
      ></Canvas>
      <Session
        isloading={isshare}
        roomInfo={roomInfo}
        setEncrptionKey={setEncrptionKey}
        userName={userName}
        setUserName={setUserName}
        onStartSession={handleStartSession}
        sessionStatus={sessionStatus}
        setSessionStatus={setSessionStatus}
      ></Session>
    </>
  );
}

export default App;
