import { useRef, useState, Fragment, useEffect } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import RenderShape from "./RenderShape";
import Konva from "konva";
import { shapes } from "konva/lib/Shape";

const Canvas = ({ ActiveTool, setActiveTool, setPointerEvent }) => {
  const [Shapes, setShapes] = useState([]);
  const [pendingid, setPendingid] = useState([]);
  const previewNodeRef = useRef(null);
  const layerRef = useRef(null);
  const startPos = useRef(null);
  const shapeRef = useRef({});
  const trRef = useRef(null);
  const isDrawing = useRef(false);
  const isShiftPressed = useRef(false);
  const isDeletePressed = useRef(false);
  const lastPos = useRef(null);
  const ActiveToolRef = useRef(null);
  const isErasingRef = useRef(false);
  const erasedIdsRef = useRef(new Set());

  useEffect(() => {
    if (pendingid.length === 0) return;

    const node = pendingid.map((id) => shapeRef.current[id]);
    if (node.length == 0) return;
    trRef.current.nodes(node);
    trRef.current.getLayer().batchDraw();

    setPendingid([]);
  }, [pendingid]);

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
  useEffect(() => {
    const down = (e) => {
      if (e.key === "Delete") {
        isDeletePressed.current = true;
        handleDeleteShape();
      }
    };
    const up = (e) => {
      if (e.key === "Delete") {
        isDeletePressed.current = false;
        handleDeleteShape();
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
    const node = shapeRef.current[id];
    shapeRef.current = shapeRef.current[id];
    if (!node) return;

    trRef.current.nodes([node]);
    trRef.current.getLayer().batchDraw();
  };

  const handleDeleteShape = () => {
    if (trRef.current && shapeRef.current) {
      const selectedNodes = trRef.current.nodes();
      if (selectedNodes.length === 0) return;
      const selectedIds = selectedNodes.map((node) => node.id());
      setShapes((prev) =>
        prev.filter((shape) => !selectedIds.includes(shape.id))
      );
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
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
    const stage = e.target.getStage();
    const clickedOnEmpty = e.target === stage;
    if (clickedOnEmpty) {
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
    if (ActiveTool == "") return;
    const point = stage.getPointerPosition();
    startPos.current = { x: point.x, y: point.y };
    if (ActiveTool === "eraser") {
      isDrawing.current = true;
      isErasingRef.current = true;
      erasedIdsRef.current.clear();

      const eraserBox = new Konva.Circle({
        x: point.x,
        y: point.y,
        radius: 5,
        fill: 'black',
        listening: false,
      });

      previewNodeRef.current = eraserBox;
      layerRef.current.add(eraserBox);
      layerRef.current.batchDraw();

      setPointerEvent("none");
      return;
    }

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
      case "selection":
        previewNodeRef.current = new Konva.Rect({
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          stroke: "lightblue",
          listening: false,
        });
        break;
      case "elipse":
        previewNodeRef.current = new Konva.Ellipse({
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
          type: "arrow",
          points: [point.x, point.y, point.x, point.y],
          listening: false,
          stroke: "black",
        });
        break;
      case "pencil":
        previewNodeRef.current = new Konva.Line({
          type: "pencil",
          points: [point.x, point.y],
          stroke: "black",
          strokeWidth: "2",
          lineCap: "round",
          lineJoin: "round",
          listening: false,
        });
        break;
    
    }

    layerRef.current.add(previewNodeRef.current);
    layerRef.current.batchDraw();
    setPointerEvent("none");
  };
  const handleMouseMove = (e) => {
    if (!isDrawing.current || ActiveTool == "" || !previewNodeRef.current)
      return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const startX = startPos.current.x;
    const startY = startPos.current.y;
    lastPos.current = pos;

    if (ActiveTool === "eraser" && isErasingRef.current) {
      const selectionBox = previewNodeRef.current;
      // const { x, y } = selectionBox.position();

      previewNodeRef.current.setAttrs({
        x: pos.x,
        y: pos.y,
      });
      const box = selectionBox.getClientRect();

      const selectedNodes = layerRef.current
        .find(".shape")
        .filter((node) =>
          Konva.Util.haveIntersection(box, node.getClientRect())
        );
      selectedNodes.forEach((node) => {
        node.opacity(0.2);
        erasedIdsRef.current.add(node.id());
      });

      return;
    }

    switch (ActiveTool) {
      case "rect":
        handleRect(pos, startX, startY);
        break;
      case "selection":
        handleRect(pos, startX, startY);
        break;
      case "elipse":
        handleElipse(pos, startX, startY);
        break;
      case "arrow":
        handleArrow(pos, startX, startY);
        break;
      case "pencil":
        handlePencil(pos);
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
  const handlePencil = (pos) => {
    if (!previewNodeRef.current) return;

    const line = previewNodeRef.current;
    const points = line.points();

    line.points([...points, pos.x, pos.y]);
  };

  const handleMouseUp = () => {
    if (!isDrawing.current || !previewNodeRef.current || ActiveTool == "")
      return;
    if (ActiveTool === "eraser") {
      const idsToDeleteSet = erasedIdsRef.current;

      setShapes((prev) =>
        prev.filter((shape) => !idsToDeleteSet.has(shape.id))
      );

      isErasingRef.current = false;
      erasedIdsRef.current.clear();

      const selectionBox = previewNodeRef.current;
      selectionBox.visible(false);

      isDrawing.current = false;
      setPointerEvent("");
      return;
    }

    if (ActiveTool === "selection") {
      const selectionBox = previewNodeRef.current;
      const box = selectionBox.getClientRect();
      const selectedNodes = layerRef.current
        .find(".shape")
        .filter((node) =>
          Konva.Util.haveIntersection(box, node.getClientRect())
        );

      setPendingid(selectedNodes.map((n) => n.id()));

      selectionBox.destroy();
      previewNodeRef.current = null;

      isDrawing.current = false;
      setActiveTool("selection");
      setPointerEvent("");
      return;
    }

    const attrs = previewNodeRef.current.getAttrs();
    const id = crypto.randomUUID();
    const Name = "shape";
    setShapes((prev) => [
      ...prev,
      {
        ...attrs,
        id,
        Name,
        type: ActiveTool,
        draggable: true,
        listening: true,
      },
    ]);
    setPendingid([id]);
    isDrawing.current = false;
    previewNodeRef.current.destroy();
    previewNodeRef.current = null;
    setActiveTool("selection");
  };

  return (
    <div className="Canvas-wrapper">
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
              if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
