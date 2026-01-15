import { useEffect, useRef, useState } from "react";
import "./Cursor.css";
import gsap from "gsap";
import { CreateRoom } from "./CreateRoom";

const Cursor = ({ isEraserEnable }) => {
  const historyRef = useRef([]);
  const currentPos = useRef(null);
  const LastPos = useRef(null);
  const trailLengthRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isEraserEnable) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const path = document.querySelector("#tail");
      path?.setAttribute("d", "");
      return;
    }

    historyRef.current = [];
    LastPos.current = null;
    currentPos.current = null;
    trailLengthRef.current = 0;

    const onMove = (e) => {
      currentPos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", onMove);
    const path = document.querySelector("#tail");
    const animate = () => {
      let speed = 0;
      if (LastPos.current && currentPos.current) {
        const dx = currentPos.current.x - LastPos.current.x;
        const dy = currentPos.current.y - LastPos.current.y;
        speed = Math.hypot(dx, dy);
      }
      if (!LastPos.current && currentPos.current) {
        // first frame after enable → initialize only
        LastPos.current = currentPos.current;
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      if (currentPos.current) {
        historyRef.current.unshift({ ...currentPos.current });
        LastPos.current = currentPos.current;
      }

      if (historyRef.current.length > 25) {
        historyRef.current.pop();
      }
      const targetLength = speed * 10;
      trailLengthRef.current += (targetLength - trailLengthRef.current) * 0.25;
      draw();
      rafRef.current = requestAnimationFrame(animate);
    };
    const draw = () => {
      const history = historyRef.current;
      if (history.length < 2) return;

      // 1️⃣ Build visible centerline points
      let total = 0;
      let visible = [];

      for (let i = 0; i < history.length - 1; i++) {
        const a = history[i];
        const b = history[i + 1];
        total += Math.hypot(a.x - b.x, a.y - b.y);
        visible.push(a);
        if (total >= trailLengthRef.current) break;
      }

      if (visible.length < 2) return;

      // 2️⃣ Build left & right outlines
      let left = [];
      let right = [];
      let curvedPoints = [];
      const maxWidth = 8;
      curvedPoints = getCurvedPoints(visible);

      for (let i = 0; i < curvedPoints.length - 1; i++) {
        const p0 = curvedPoints[i];
        const p1 = curvedPoints[i + 1];

        let dx = p1.x - p0.x;
        let dy = p1.y - p0.y;

        let len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        const nx = -dy;
        const ny = dx;

        const t = i / (curvedPoints.length - 1);
        const width =
          t < 0.2
            ? maxWidth * Math.sin(((t / 0.2) * Math.PI) / 2)
            : maxWidth * (1 - t);

        const half = width / 2;

        left.push({ x: p0.x + nx * half, y: p0.y + ny * half });
        right.push({ x: p0.x - nx * half, y: p0.y - ny * half });
      }

      // 3️⃣ Build OUTLINE SVG path
      let d = `M ${left[0].x} ${left[0].y}`;

      for (let i = 1; i < left.length; i++) {
        d += ` L ${left[i].x} ${left[i].y}`;
      }

      for (let i = right.length - 1; i >= 0; i--) {
        d += ` L ${right[i].x} ${right[i].y}`;
      }

      d += " Z";

      path.setAttribute("d", d);
      path.setAttribute("fill", "black");
    };
    function catmullRom(p0, p1, p2, p3, t) {
      const t2 = t * t;
      const t3 = t2 * t;

      return {
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      };
    }
    function getCurvedPoints(points) {
      if (points.length < 4) return points;

      const curved = [];

      for (let i = 0; i < points.length - 3; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const p2 = points[i + 2];
        const p3 = points[i + 3];

        for (let t = 0; t <= 1; t += 0.08) {
          curved.push(catmullRom(p0, p1, p2, p3, t));
        }
      }

      return curved;
    }

    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isEraserEnable]);

  return (
    <>
      {
        <svg width="100%" height="100%" className="cursordot">
          <path id="tail" stroke="black" strokeLinejoin="round" />
        </svg>
      }
    </>
  );
};
export default Cursor;
