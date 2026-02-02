import "./Tool.css";

const Tool = ({
  setActiveTool,
  ActiveTool,
  fileRef,
  handleUploadClick,
  handleFileChange,
}) => {
  return (
    <>
      <div className="tool-wrapper">
        <button
          id="hand-btn"
          className={ActiveTool === "hand" ? "active-hand" : ""}
          onMouseDown={() => {
            setActiveTool("hand");
          }}
        ></button>
        <button
          id="selection-btn"
          className={ActiveTool === "selection" ? "active-selection" : ""}
          onMouseDown={() => {
            setActiveTool("selection");
          }}
        ></button>
        <button
          id="rect-btn"
          className={ActiveTool === "rect" ? "active-rect" : ""}
          onMouseDown={() => {
            setActiveTool("rect");
          }}
        ></button>
        <button
          id="circ-btn"
          className={ActiveTool === "elipse" ? "active-circ" : ""}
          onMouseDown={() => {
            setActiveTool("elipse");
          }}
        ></button>
        <button
          id="arrow-btn"
          className={ActiveTool === "arrow" ? "active-arrow" : ""}
          onMouseDown={() => {
            setActiveTool("arrow");
          }}
        ></button>
        <button
          id="pencil-btn"
          className={ActiveTool === "pencil" ? "active-pencil" : ""}
          onMouseDown={() => {
            setActiveTool("pencil");
          }}
        ></button>
        <button
          id="eraser-btn"
          className={ActiveTool === "eraser" ? "active-eraser" : ""}
          onMouseDown={() => {
            setActiveTool("eraser");
          }}
        ></button>
        <button
          id="image-btn"
          className={ActiveTool === "image" ? "active-image" : ""}
          onMouseDown={() => {
            handleUploadClick();
          }}
        ></button>

        <input
          type="file"
          onChange={handleFileChange}
          accept="image/*"
          ref={fileRef}
          style={{ display: "none" }}
        />
      </div>
    </>
  );
};
export default Tool;
