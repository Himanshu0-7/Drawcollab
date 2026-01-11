import "./Navbar.css";
import Tool from "./Tool";

const Navbar = ({ shareBtn, setActiveTool, ActiveTool, pointerEvent }) => {
  return (
    <>
      <nav className="Navbar" style={{ pointerEvents: pointerEvent }}>
        {/* <div> */}
        <h1>Websocket Test</h1>
        <Tool setActiveTool={setActiveTool} ActiveTool={ActiveTool}></Tool>
        <div>
          <button id="share-button" onClick={shareBtn}>
            Share
          </button>
        </div>
      </nav>
      {/* </div> */}
    </>
  );
};

export default Navbar;
