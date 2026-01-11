import { useEffect, useRef, useState } from "react";
import "./Cursor.css";
import gsap from "gsap";
import { CreateRoom } from "./CreateRoom";

const Cursor = ({ cursors, wsRef }) => {
  const historyRef = useRef([]);
  useEffect(() => {
    const path = document.querySelector("#tail");

    window.addEventListener("mousemove", (e) => {
      historyRef.current.unshift({
        x: e.clientX,
        y: e.clientY,
      });
      if (historyRef.current.length > 10) {
        historyRef.current.pop();
      }
      const history = historyRef.current;
      if (history.length < 2) return;
      const head = history[0];
      const tail = history[history.length - 1];

  
  
      const d = `M ${head.x} ${head.y} L ${tail.x} ${tail.y}`;
  
      path.setAttribute("d", d);
    });
  }, []);

  return (
    <>
      <svg width="100%" height="100%" className="cursordot">
        <path id="tail" stroke="black" fill="none" strokeWidth="10" />
      </svg>
    </>
  );
};
export default Cursor;
