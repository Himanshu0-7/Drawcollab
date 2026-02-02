import gsap from "gsap";
import "./Session.css";
import { useEffect } from "react";
import { CreateRoom } from "./CreateRoom";
const Session = ({
  isloading,
  roomInfo,
  setEncrptionKey,
  userName,
  setUserName,
  onStartSession,
  sessionStatus,
  setSessionStatus,
}) => {
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
          {/* <Sky></Sky> */}
          <h1>Go Live</h1>
          {roomInfo && (
            <div>
              <label id="name-title">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                }}
                className="session-userName"
              />
              <div className="whitespace"></div>
              <div className="roomurl-wrapper">
                <div className="roomurl-overlay">
                  <label id="roomurl-title">Link</label>
                  <input
                    type="url"
                    value={roomUrl}
                    readOnly
                    className="room-url"
                  />
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
            </div>
          )}

          <CreateRoom
            setEncrptionKey={setEncrptionKey}
            onStartSession={onStartSession}
            sessionStatus={sessionStatus}
            setSessionStatus={setSessionStatus}
          ></CreateRoom>
        </section>
      </div>
    </>
  );
};
export default Session;
