import { useState } from "react";
import "./Tool.css";

const Tool = ({setActiveTool}) => {
const [isclicked, setIsclicked] = useState('')
  return (
    <>
      <div className="tool-wrapper">
        <button
          id="rect-btn"
          className={isclicked ==='rect'? "active-rect" : ""}
          onMouseDown={() => {setActiveTool('rect'), setIsclicked('rect')}}
          onMouseUp={() => setIsclicked('')}
          onMouseLeave={() => setIsclicked('')}
        ></button>
        <button
          id="circ-btn"
          className={isclicked ==='elipse' ? "active-circ" : ""}
          onMouseDown={() => {setActiveTool('elipse'), setIsclicked('elipse')}}
          onMouseUp={() => setIsclicked('')}
          onMouseLeave={() => setIsclicked('')}
        ></button>
        <button
          id="arrow-btn"
          className={isclicked ==='arrow' ? "active-circ" : ""}
          onMouseDown={() => {setActiveTool('arrow'), setIsclicked('arrow')}}
          onMouseUp={() => setIsclicked('')}
          onMouseLeave={() => setIsclicked('')}
        ></button>
      </div>
    </>
  );
};
export default Tool;
