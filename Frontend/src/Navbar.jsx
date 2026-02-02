import "./Navbar.css";
import Tool from "./Tool";

const Navbar = ({ shareBtn, setActiveTool, ActiveTool, pointerEvent, fileRef, handleUploadClick, handleFileChange }) => {
  return (
    <>
      <nav className="Navbar" style={{ pointerEvents: pointerEvent }}>
        {/* <div> */}
        <h1>                                      </h1>
        <Tool setActiveTool={setActiveTool} ActiveTool={ActiveTool} fileRef={fileRef}
          handleUploadClick={handleUploadClick} handleFileChange={handleFileChange}></Tool>
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
