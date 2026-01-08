import { useRef, useState, Fragment, useEffect } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import RenderShape from "./RenderShape";
import Konva from "konva";
import { shapes } from "konva/lib/Shape";

const Canvas = ({ ActiveTool }) => {
  const [Shapes, setShapes] = useState([]);
  // const [pendingid, setPendingid] = useState(null)
  const pendingidRef = useRef(null);
  const previewNodeRef = useRef(null);
  const layerRef = useRef(null);
  const [isPreview, setIsPreview] = useState(false);
  const startPos = useRef(null);
  const shapeRef = useRef({});
  const trRef = useRef(null);
  const isDrawing = useRef(false);
  const isShiftPressed = useRef(false);
  const lastPos = useRef(null);
  const ActiveToolRef = useRef(null);
  useEffect(() => {
    const id = pendingidRef.current;
    if (!id) return;

    const node = shapeRef.current[id];
    if (!node) return; 

    trRef.current.nodes([node]);
    trRef.current.getLayer().batchDraw();

    pendingidRef.current = null; // consume
  }, [Shapes]);

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
      // console.log("refs:", shapeRef.current);
    } else {
      delete shapeRef.current[id];
    }
  };

  const transformerRef = (id) => {
    const node = shapeRef.current[id];
    if (!node) return;

    trRef.current.nodes([node]);
    trRef.current.getLayer().batchDraw(); // 🔑 REQUIRED
    console.log("selected:", trRef.current.nodes());
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
      trRef.current.getLayer().batchDraw();
    }
    startPos.current = { x: point.x, y: point.y };
    isDrawing.current = true;
    switch (ActiveTool) {
      case "rect":
        previewNodeRef.current = new Konva.Rect({
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          stroke: "black",
          listening: false,
        });
        break;
      case "elipse":
        previewNodeRef.current = new Konva.Ellipse({
          id: crypto.randomUUID(),
          type: "elipse",
          x: point.x,
          y: point.y,
          radiusX: 0,
          radiusY: 0,
          stroke: "black",
          listening: false,
        });
        break;

      case "arrow":
        previewNodeRef.current = new Konva.Arrow({
          id: crypto.randomUUID(),
          type: "arrow",
          points: [point.x, point.y, point.x, point.y],
          listening: false,
          stroke: "black",
        });
        break;
    }
    layerRef.current.add(previewNodeRef.current);
    layerRef.current.batchDraw();

    setIsPreview(true);
  };
  const handleMouseMove = (e) => {
    if (!isDrawing.current || ActiveTool == "" || !previewNodeRef.current)
      return;

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
    if (!previewNodeRef.current) return;
    // if(isShiftPressed.current){

    // }
    previewNodeRef.current.setAttrs({
      x: Math.min(startX, pos.x),
      y: Math.min(startY, pos.y),
      width: Math.abs(pos.x - startX),
      height: Math.abs(pos.y - startY),
    });
  };
  const handleElipse = (pos, startX, startY) => {
    if (!previewNodeRef.current) return;
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
    previewNodeRef.current.setAttrs({
      radius,
      radiusX,
      radiusY,
    });
  };
  const handleArrow = (pos, startX, startY) => {
    if (!previewNodeRef.current) return;
    previewNodeRef.current.setAttrs({
      points: [startX, startY, pos.x, pos.y],
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing.current || !previewNodeRef.current || ActiveTool == "")
      return;
    const attrs = previewNodeRef.current.getAttrs();
    const id = crypto.randomUUID();

    setShapes((prev) => [
      ...prev,
      {
        ...attrs,
        id,
        type: ActiveTool,
        draggable: true,
        listening: true,
      },
    ]);
    pendingidRef.current = id;
    previewNodeRef.current.destroy();
    previewNodeRef.current = null;
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
      <Layer ref={layerRef}>
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
