import gsap from "gsap";
import "./Session.css";
import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import Sky from "./Animation/Sky";
import { CreateRoom } from "./CreateRoom";
const Session = ({ isloading, roomInfo }) => {
  const roomUrl = window.location.href;
  useEffect(() => {
    if (isloading === 1) {
      gsap.to(".session-container", {
        display: "flex",
        duration: 0,
      });
    } else {
      gsap.to(".session-container", {
        display: "none",
        duration: 0,
      });
    }
  }, [isloading]);

  return (
    <>
      <div className="session-container shared-container">
        <section className="Session-overlay">
          <Sky></Sky>
          <h1>Go Live</h1>
          {/* {roomInfo && ( */}
          <div className="roomurl-wrapper">
            <div className="roomurl-overlay">
              <label id="roomurl-title">Link</label>
              <input type="url" value={roomUrl} readOnly className="room-url" />
            </div>
            <button
              className="copyUrl-btn"
              onClick={() => {
                navigator.clipboard.writeText(roomUrl);
              }}
            >
              Copy Link
            </button>
          </div>
          {/* )} */}

          <CreateRoom></CreateRoom>
        </section>
      </div>
    </>
  );
};
export default Session;
