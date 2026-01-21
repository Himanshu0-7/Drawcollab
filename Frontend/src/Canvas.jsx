import { useRef, useState, Fragment, useEffect, version } from "react";
import { Stage, Layer, Rect, Transformer, Shape } from "react-konva";
import RenderShape from "./RenderShape";
import Konva from "konva";
const Canvas = ({
  ActiveTool,
  setActiveTool,
  setPointerEvent,
  setIsEraserEnable,
  roomInfo,
  encryptionKey,
}) => {
  // ______________________________________
  //
  //              STATE
  // ______________________________________

  const [Shapes, setShapes] = useState([]);
  const [pendingid, setPendingid] = useState([]);
  const [socket, setSocket] = useState(null);

  // ______________________________________
  //              REFS
  // ______________________________________

  const layerRef = useRef(null);
  const previewNodeRef = useRef(null);
  const trRef = useRef(null);
  const shapeRef = useRef({});
  const currentDrawingIdRef = useRef(null);
  const isShiftPressed = useRef(false);
  const isDrawing = useRef(false);
  const isDeletePressed = useRef(false);
  const isErasingRef = useRef(false);
  const lastPos = useRef(null);

  const ActiveToolRef = useRef(null);
  const startPos = useRef(null);
  const erasedIdsRef = useRef(new Set());
  const [remoteCUrsors, setRemoteCursors] = useState(new Map());
  const pendingBroadcastRef = useRef([]);

  /*______________________________________

            useEffects
______________________________________*/
  // Add state for stage dimensions
  const [stageDimensions, setStageDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Add this useEffect to handle window resize
  useEffect(() => {
    const handleResize = () => {
      setStageDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  const [cryptoKey, setCryptoKey] = useState(null);
  const CURSOR_INTERVAL = 40; // ms (~25 FPS)
  let lastCursorSent = 0;

  useEffect(() => {
    if (!encryptionKey) return;
    crypto.subtle
      .importKey(
        "jwk",
        encryptionKey, // FULL JWK
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
      )
      .then((cryptoKey) => {
        setCryptoKey(cryptoKey);
      });
  }, [encryptionKey]);

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

  const initialScenePayload = async () => {
    const encryptedBlob = await encryptData(JSON.stringify({ Shapes }));
    await fetch(`http://localhost:3000/api/payload?room=${roomInfo.roomId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: encryptedBlob,
    });

    const ws = new WebSocket(`ws://localhost:3000/ws?room=${roomInfo.roomId}`);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      console.log("ws connected to roomid", roomInfo.roomId);
    };
    ws.onmessage = async (e) => {
      const { type, decryptedPayload } = await decodeAndDecryptFrame(
        e.data,
        cryptoKey,
      );
      await handleWebsocketMessgae(type, decryptedPayload);
    };

    setSocket(ws);
    return () => {
      ws.close();
    };
  };
  /*_________________________________________
  
  Handling Websocket          
  __________________________________________*/

  useEffect(() => {
    if (!roomInfo || !cryptoKey) return;
    initialScenePayload();
  }, [roomInfo, cryptoKey]);

  const handleWebsocketMessgae = (type, decryptedPayload) => {
    console.log("RECEIVED TYPE:", type, decryptedPayload);

    switch (type) {
      case "SCENE_UPDATE":
        handleRemoteSceneUpdate(decryptedPayload);
        break;
      case "SCENE_UPDATE_DRAWING":
        handleRemoteDrawingUpdate(decryptedPayload);
        break;
      case "MOUSE_LOCATION":
        handleRemoteMouseLocation(decryptedPayload);
        break;
      case "USER_JOINED":
        console.log("User Joined", decryptedPayload);
        break;
      case "USER_LEFT":
        handleUserLeft(decryptedPayload);
        break;
    }
  };

  const handleRemoteSceneUpdate = (payload) => {
    try {
      const { Shapes: remoteShape } = payload;

      setShapes((prevShapes) => {
        const shapeMap = new Map(prevShapes.map((s) => [s.id, s]));
        remoteShape.forEach((remoteShape) => {
          const localShape = shapeMap.get(remoteShape.id);
          if (
            !localShape ||
            remoteShape.version > localShape.version ||
            remoteShape.versionNonce !== localShape.versionNonce
          ) {
            shapeMap.set(remoteShape.id, remoteShape);
          }
        });
        return Array.from(shapeMap.values());
      });
    } catch (error) {
      console.error("Failed to Decrypt Scene Update", error);
    }
  };

  // Update handleRemoteDrawingUpdate to handle preview shapes
  const handleRemoteDrawingUpdate = (payload) => {
    try {
      const { Shapes: remoteShapes } = payload;
      console.log("Payload", payload);

      setShapes((prevShapes) => {
        const shapeMap = new Map();

        prevShapes.forEach((shape) => {
          if (!shape.isPreview) {
            shapeMap.set(shape.id, shape);
          }
        });

        remoteShapes.forEach((shape) => {
          shapeMap.set(shape.id, {
            ...shape,
            isPreview: true,
            listening: false,
            draggable: false,
          });
        });

        return Array.from(shapeMap.values());
      });
    } catch (error) {
      console.error("Failed to Update Drawing", error);
    }
  };

  const sendCursorPosition = async (x, y) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    if (now - lastCursorSent < CURSOR_INTERVAL) return;
    lastCursorSent = now;
    const encryptedBlob = await encryptData(JSON.stringify({ x, y }));
    const frame = buildFrame({
      type: "MOUSE_LOCATION",
      encryptedData: encryptedBlob,
    });

    socket.send(frame);
  };

  const handleRemoteMouseLocation = (payload) => {
    setRemoteCursors((prev) => {
      const next = new Map(prev);
      next.set(payload.userId, {
        x: payload.x,
        y: payload.y,
        userName: payload.userName || "",
        lastSeen: Date.now(),
      });
      return next;
    });
    /* Handling Mouse Delete if inActivity for 3 second */
    // setTimeout(() => {
    //   setRemoteCursors((prev) => {
    //     const next = new Map(prev);
    //     next.delete(payload.userId);
    //     return next;
    //   });
    // }, 3000);
  };
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setRemoteCursors((prev) => {
        const next = new Map(prev);
        for (const [id, cursor] of next) {
          if (now - cursor.lastSeen > 3000) {
            next.delete(id);
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleUserLeft = (payload) => {
    setRemoteCursors((prev) => {
      const next = new Map(prev);
      next.delete(payload.userId);
      return next;
    });
  };

  /* ________________________________

    KeyBoard Handling
    
 _________________________________*/

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

  const encryptData = async (data) => {
    if (!cryptoKey) return null;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      cryptoKey,
      encoded,
    );
    const encrypted = new Uint8Array(encryptedBuffer);
    const encryptedBlob = new Uint8Array(iv.length + encrypted.length);
    encryptedBlob.set(iv, 0);
    encryptedBlob.set(encrypted, iv.length);
    return encryptedBlob;
  };

  async function decodeAndDecryptFrame(buffer, key) {
    const view = new DataView(buffer);
    const headerLength = view.getUint32(0);

    const headerBytes = new Uint8Array(buffer, 4, headerLength);
    const header = JSON.parse(new TextDecoder().decode(headerBytes));

    const encryptedBlob = new Uint8Array(buffer, 4 + headerLength);
    const decryptedText = await decryptData(encryptedBlob, key);

    return {
      type: header.type,
      decryptedPayload: JSON.parse(decryptedText),
    };
  }

  const decryptData = async (encryptedBlob, key) => {
    // console.log(encryptedBlob)
    const iv = encryptedBlob.slice(0, 12);
    const data = encryptedBlob.slice(12);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data,
    );
    return new TextDecoder().decode(decryptedBuffer);
  };
  const broadCasteShapeUpdate = async (Shapes, isDrawing = false) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !cryptoKey) return;
    // console.log(shapes);
    try {
      const encryptedBlob = await encryptData(JSON.stringify({ Shapes }));
      const frame = buildFrame({
        type: isDrawing ? "SCENE_UPDATE_DRAWING" : "SCENE_UPDATE",
        encryptedData: encryptedBlob,
      });
      console.log(
        "SENDING FRAME TYPE:",
        isDrawing ? "SCENE_UPDATE_DRAWING" : "SCENE_UPDATE",
      );
      socket.send(frame);
    } catch (error) {
      console.error("Failed to broadcast update:", error);
    }
  };

  function buildFrame({ type, encryptedData }) {
    const header = { type };
    const headerBytes = new TextEncoder().encode(JSON.stringify(header));

    const buffer = new ArrayBuffer(
      4 + headerBytes.byteLength + encryptedData.byteLength,
    );

    const view = new DataView(buffer);
    view.setUint32(0, headerBytes.byteLength);

    let offset = 4;
    new Uint8Array(buffer, offset, headerBytes.byteLength).set(headerBytes);
    offset += headerBytes.byteLength;

    new Uint8Array(buffer, offset).set(encryptedData);

    return buffer;
  }

  /*___________________________________

  
              Refs Register
  
  _____________________________________*/

  const RegisterRef = (id, node) => {
    if (node) {
      shapeRef.current[id] = node;
    } else {
      delete shapeRef.current[id];
    }
  };

  const transformerRef = (id) => {
    const node = shapeRef.current[id];
    if (!node) return;

    // ❗ skip deleted shapes
    const shape = Shapes.find((s) => s.id === id);
    if (!shape || shape.deleted) return;

    trRef.current.nodes([node]);
    trRef.current.getLayer().batchDraw();
  };

  /* ____________________________________________________________

                      Handling Soft Delete-Shape 
                      
  _______________________________________________________________*/

  const handleDeleteShape = () => {
    if (!trRef.current) return;

    const selectedNodes = trRef.current.nodes();
    if (selectedNodes.length === 0) return;

    const ids = new Set(selectedNodes.map((node) => node.id()));

    setShapes((prev) => {
      const deleted = [];
      const updated = prev.map((s) => {
        if (!ids.has(s.id)) return s;

        const next = {
          ...s,
          deleted: true,
          version: (s.version || 0) + 1,
          versionNonce: Math.random(),
        };

        deleted.push(next);
        return next;
      });

      pendingBroadcastRef.current = deleted;
      return updated;
    });

    trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw();
  };

  useEffect(() => {
    if (!pendingBroadcastRef.current.length) return;
    if (!socket || socket.readyState !== WebSocket.OPEN || !cryptoKey) return;

    broadCasteShapeUpdate(pendingBroadcastRef.current);
    pendingBroadcastRef.current = [];
  }, [Shapes, socket, cryptoKey]);

  /*________________________________________________
  
              Handling Shape-Update While-Drawing 
              
  _________________________________________________*/

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

  /* _____________________________________

               Handling All MouseEvents 
  ________________________________________*/

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

    // ✅ Generate a temporary ID for this drawing session
    currentDrawingIdRef.current = crypto.randomUUID();

    if (ActiveTool === "eraser") {
      isDrawing.current = true;
      setIsEraserEnable(true);
      isErasingRef.current = true;
      erasedIdsRef.current.clear();

      const eraserBox = new Konva.Circle({
        x: point.x,
        y: point.y,
        radius: 5,
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
          draggable: false,
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
          draggable: false,
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
          draggable: false,
        });
        break;

      case "arrow":
        previewNodeRef.current = new Konva.Arrow({
          type: "arrow",
          points: [point.x, point.y, point.x, point.y],
          listening: false,
          stroke: "black",
          draggable: false,
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
          draggable: false,
        });
        break;
    }

    layerRef.current.add(previewNodeRef.current);
    layerRef.current.batchDraw();
    setPointerEvent("none");
  };

// Add state for stage dimensions


// Update dimensions on resize


// Add global mouse listeners
useEffect(() => {
  const handleGlobalMouseMove = (e) => {
    if (!isDrawing.current || ActiveTool === "" || !previewNodeRef.current) return;
    
    const stage = layerRef.current?.getStage();
    if (!stage) return;

    // Get mouse position relative to the stage
    const rect = stage.container().getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    lastPos.current = pos;
    sendCursorPosition(pos.x, pos.y);

    // Handle eraser
    if (ActiveTool === "eraser" && isErasingRef.current) {
      previewNodeRef.current.setAttrs({ x: pos.x, y: pos.y });
      const box = previewNodeRef.current.getClientRect();
      const selectedNodes = layerRef.current
        .find(".shape")
        .filter((node) => Konva.Util.haveIntersection(box, node.getClientRect()));
      selectedNodes.forEach((node) => {
        node.opacity(0.2);
        erasedIdsRef.current.add(node.id());
      });
      layerRef.current.batchDraw();
      return;
    }

    const startX = startPos.current.x;
    const startY = startPos.current.y;

    // Handle other tools
    switch (ActiveTool) {
      case "rect":
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

    layerRef.current.batchDraw();

    // Broadcast preview
    if (previewNodeRef.current && ActiveTool !== "selection" && ActiveTool !== "eraser") {
      const attrs = previewNodeRef.current.getAttrs();
      const tempShape = {
        ...attrs,
        id: currentDrawingIdRef.current,
        type: ActiveTool,
        version: 1,
        deleted: false,
        isPreview: true,
      };
      broadCasteShapeUpdate([tempShape], true);
    }
  };

  const handleGlobalMouseUp = () => {
    if (isDrawing.current) {
      handleMouseUp();
    }
  };

  window.addEventListener('mousemove', handleGlobalMouseMove);
  window.addEventListener('mouseup', handleGlobalMouseUp);

  return () => {
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
  };
}, [ActiveTool, Shapes]); // Add dependencies as needed

  const handleMouseUp = async () => {
    if (!isDrawing.current || !previewNodeRef.current || ActiveTool == "")
      return;

    if (ActiveTool === "eraser") {
      // ... existing eraser logic ...
      layerRef.current.find(".shape").forEach((node) => {
        node.opacity(1);
      });

      const ids = new Set(erasedIdsRef.current);

      setShapes((prev) => {
        const updated = prev.map((s) =>
          ids.has(s.id) ? { ...s, deleted: true, version: s.version + 1 } : s,
        );
        broadCasteShapeUpdate(updated.filter((s) => ids.has(s.id)));
        return updated;
      });

      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();

      previewNodeRef.current.destroy();
      previewNodeRef.current = null;

      erasedIdsRef.current.clear();
      isErasingRef.current = false;
      isDrawing.current = false;

      setIsEraserEnable(false);
      setPointerEvent("");
      return;
    }

    if (ActiveTool === "selection") {
      const selectionBox = previewNodeRef.current;
      const box = selectionBox.getClientRect();
      const selectedNodes = layerRef.current
        .find(".shape")
        .filter((node) =>
          Konva.Util.haveIntersection(box, node.getClientRect()),
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
    // ✅ Use the same ID from drawing session
    const id = currentDrawingIdRef.current;
    const Name = "shape";
    const newShape = {
      ...attrs,
      id,
      Name,
      type: ActiveTool,
      draggable: true,
      listening: true,
      deleted: false,
      version: 1,
      versionNonce: Math.random(),
      isPreview: false, // ✅ No longer a preview
    };

    setShapes((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      const next = [...filtered, newShape];
      broadCasteShapeUpdate(next);
      return next;
    });

    setPendingid([id]);
    isDrawing.current = false;
    previewNodeRef.current.destroy();
    previewNodeRef.current = null;
    currentDrawingIdRef.current = null; // ✅ Clear temp ID
    setActiveTool("selection");
    setPointerEvent("");
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

  /*___________________________________
  
  Rendering Canvas & Drawing
  _____________________________________*/
  return (
    <div className="Canvas-wrapper">
      <Stage
        width={stageDimensions.width}
        height={stageDimensions.height}
        onMouseDown={handleMouseDown}
        // onMouseMove={handleMouseMove}
        // onMouseUp={handleMouseUp}
      >
        <Layer ref={layerRef}>
          {Shapes.filter((s) => !s.deleted).map((shape) => {
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
