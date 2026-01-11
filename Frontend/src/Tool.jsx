import { useState } from "react";
import "./Tool.css";
import { Arrow } from "react-konva";

const Tool = ({ setActiveTool, ActiveTool }) => {
  // const [isclicked, setIsclicked] = useState('')
  return (
    <>
      <div className="tool-wrapper">
        <button
          id="selection-btn"
          className={ActiveTool === "selection" ? "active-selection" : ""}
          onMouseDown={() => {
            setActiveTool("selection");
          }}
        >
          <svg viewBox="-80 -60 160 120" aria-hidden="true">
            <rect
              x="-40"
              y="-25"
              width="80"
              height="50"
              fill="none"
              stroke="black"
              strokeWidth="7"
            />
            <line
              x1="-40"
              y1="-25"
              x2="-70"
              y2="-25"
              stroke="black"
              strokeWidth="7"
            />
            <line
              x1="-40"
              y1="-25"
              x2="-40"
              y2="-55"
              stroke="black"
              strokeWidth="7"
            />
            <line
              x1="40"
              y1="25"
              x2="70"
              y2="25"
              stroke="black"
              strokeWidth="7"
            />
            <line
              x1="40"
              y1="25"
              x2="40"
              y2="55"
              stroke="black"
              strokeWidth="7"
            />
          </svg>
        </button>
        <button
          id="rect-btn"
          className={ActiveTool === "rect" ? "active-rect" : ""}
          onMouseDown={() => {
            setActiveTool("rect");
          }}
        >
          {" "}
          <svg viewBox="-80 -60 160 120" aria-hidden="true">
            <rect
              x="-50"
              y="-30"
              width="100"
              height="60"
              fill="none"
              stroke="black"
              strokeWidth="7"
            />
          </svg>
        </button>
        <button
          id="circ-btn"
          className={ActiveTool === "elipse" ? "active-circ" : ""}
          onMouseDown={() => {
            setActiveTool("elipse");
          }}
        >
          {" "}
          <svg viewBox="-80 -60 160 120" aria-hidden="true">
            <circle
              cx="0"
              cy="0"
              r="50"
              fill="none"
              stroke="black"
              strokeWidth="7"
            />
          </svg>
        </button>
        <button
          id="arrow-btn"
          className={ActiveTool === "arrow" ? "active-arrow" : ""}
          onMouseDown={() => {
            setActiveTool("arrow");
          }}
        >
          {" "}
          <svg viewBox="-80 -60 160 120" aria-hidden="true">
            <path
              d="
           M -49 -49
           L  49 49
           M 49 49
           L 30 44
           M 49 49
           L 44 30

           "
              fill="none"
              stroke="black"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          id="pencil-btn"
          className={ActiveTool === "pencil" ? "active-pencil" : ""}
          onMouseDown={() => {
            setActiveTool("pencil");
          }}
        >
          {" "}
          <svg viewBox="-80 -60 160 120" aria-hidden="true">
            <path
              d="

             
              M 44 54
              L -54 -44
              C -55 -45 -45 -55 -44 -54             
              L  54 44
              z
              M -45 -38 
              L -38 -48 
              

           "
              fill="none"
              stroke="black"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="
              M 54 44
              L 65 65
              L 44 54
              Z
  "
              fill="black"
            />
          </svg>
        </button>
        <button
          id="eraser-btn"
          className={ActiveTool === "eraser" ? "active-eraser" : ""}
          onMouseDown={() => {
            setActiveTool("eraser");
          }}
        >
          {" "}
          <svg viewBox="-80 -60 160 120" aria-hidden="true">
            <path
              d="

             
              M 44 54
              L -54 -44
              C -55 -45 -45 -55 -44 -54             
              L  54 44
              z
              M -45 -38 
              L -38 -48 
              

           "
              fill="none"
              stroke="black"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="
              M 54 44
              L 65 65
              L 44 54
              Z
  "
              fill="black"
            />
          </svg>
        </button>
      </div>
    </>
  );
};
export default Tool;
