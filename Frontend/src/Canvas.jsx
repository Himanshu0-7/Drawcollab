import { useRef, useState, Fragment, useEffect } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import RenderShape from "./RenderShape";

const Canvas = ({ ActiveTool }) => {
  const [Shapes, setShapes] = useState([]);
  const [PreveiwShapes, setPreviewShapes] = useState([]);
  const [isPreview, setIsPreview] = useState(false);
  const startPos = useRef(null);
  const shapeRef = useRef({});
  const trRef = useRef(null);
  const isDrawing = useRef(false);
  const isShiftPressed = useRef(false);
  const lastPos = useRef(null);
  const ActiveToolRef = useRef(null);

  useEffect(() => {
    ActiveToolRef.current = ActiveTool;
  }, [ActiveTool]);
  useEffect(() => {
    const down = (e) => {
      if (e.key === "Shift") {
        isShiftPressed.current = true;
        handleUpdateShape();
      }
    };
    const up = (e) => {
      if (e.key === "Shift") {
        isShiftPressed.current = false;
        handleUpdateShape();
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  const RegisterRef = (id, node) => {
    if (node) {
      shapeRef.current[id] = node;
    } else {
      delete shapeRef.current[id];
    }
  };

  const transformerRef = (id) => {
    trRef.current.nodes([shapeRef.current[id]]);
  };
  const handleUpdateShape = () => {
    if (!lastPos.current || !startPos.current) return;
    switch (ActiveToolRef.current) {
      case "rect":
        handleRect(lastPos.current, startPos.current.x, startPos.current.y);
        break;
      case "elipse":
        handleElipse(lastPos.current, startPos.current.x, startPos.current.y);
        break;

      case "arrow":
        break;
    }
  };
  const handleMouseDown = (e) => {
    if (ActiveTool == "") return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const clickedOnEmpty = e.target === stage;
    if (clickedOnEmpty) {
      trRef.current.nodes([]);
    }
    startPos.current = { x: point.x, y: point.y };
    isDrawing.current = true;
    switch (ActiveTool) {
      case "rect":
        setPreviewShapes({
          id: crypto.randomUUID(),
          type: "rect",
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
        });
        break;
      case "elipse":
        setPreviewShapes({
          id: crypto.randomUUID(),
          type: "elipse",
          x: point.x,
          y: point.y,
          radiusX: 0,
          radiusY: 0,
        });
        break;

      case "arrow":
        setPreviewShapes({
          id: crypto.randomUUID(),
          type: "arrow",
          points: [point.x, point.y, point.x, point.y],
        });
        break;
    }

    setIsPreview(true);
  };
  const handleMouseMove = (e) => {
    if (!isDrawing.current || ActiveTool == "" || !PreveiwShapes) return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const startX = startPos.current.x;
    const startY = startPos.current.y;
    lastPos.current = pos;
    switch (ActiveTool) {
      case "rect":
        handleRect(pos, startX, startY);
        break;
      case "elipse":
        handleElipse(pos, startX, startY);
        break;
      case "arrow":
        handleArrow(pos, startX, startY);
        break;
    }
  };
  const handleRect = (pos, startX, startY) => {
    // if(isShiftPressed.current){

    // }
    setPreviewShapes((prev) => ({
      ...prev,
      x: Math.min(pos.x, startX),
      y: Math.min(pos.y, startY),
      width: Math.abs(pos.x - startX),
      height: Math.abs(pos.y - startY),
    }));
  };
  const handleElipse = (pos, startX, startY) => {
    const dx = pos.x - startX;
    const dy = pos.y - startY;
    const radius = Math.sqrt(dx * dx + dy * dy);
    let radiusX = Math.abs(dx);
    let radiusY = Math.abs(dy);
    if (isShiftPressed.current) {
      const r = Math.min(radiusX, radiusY);
      radiusX = r;
      radiusY = r;
    }
    setPreviewShapes((prev) => ({
      ...prev,
      radius,
      radiusX,
      radiusY,
    }));
  };
  const handleArrow = (pos, startX, startY) => {
    setPreviewShapes((prev) => ({
      ...prev,
      points: [startX, startY, pos.x, pos.y],
    }));
  };

  const handleMouseUp = () => {
    if (!isDrawing.current || !PreveiwShapes || ActiveTool == "") return;

    setShapes((prev) => [...prev, PreveiwShapes]);
    setPreviewShapes(null);
    setIsPreview(false);
    isDrawing.current = false;
  };

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Layer>
        {Shapes.map((shape) => {
          return (
            <RenderShape
              key={shape.id}
              shape={shape}
              RegisterRef={RegisterRef}
              transformerRef={transformerRef}
            />
          );
        })}
        {isPreview && PreveiwShapes && (
          <RenderShape shape={PreveiwShapes} isPreview={isPreview} />
        )}
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
};

export default Canvas;
