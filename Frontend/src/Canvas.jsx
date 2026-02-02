import { useRef, useState, useEffect } from "react";
import {
  Stage,
  Layer,
  Rect,
  Transformer,
  Group,
  Text,
  Arrow,
} from "react-konva";
import RenderShape from "./RenderShape";
import Konva from "konva";
import "./Canvas.css";
const Canvas = ({
  ActiveTool,
  setActiveTool,
  setPointerEvent,
  setIsEraserEnable,
  roomInfo,
  encryptionKey,
  pointerEvent,
  userName,
}) => {
  // ______________________________________
  //
  //              STATE
  // _____________________________________

  const [Shapes, setShapes] = useState([]);
  const [pendingid, setPendingid] = useState([]);
  const [socket, setSocket] = useState(null);

  // ______________________________________
  //              REFS
  // ______________________________________
  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const previewNodeRef = useRef(null);
  const trRef = useRef(null);
  const shapeRef = useRef({});

  const lastDragSentRef = useRef(0);
  const currentDrawingIdRef = useRef(null);
  const isShiftPressed = useRef(false);
  const isDrawing = useRef(false);
  const isDeletePressed = useRef(false);
  const isErasingRef = useRef(false);
  const lastPos = useRef(null);

  const ActiveToolRef = useRef(null);
  const startPos = useRef(null);
  const erasedIdsRef = useRef(new Set());
  const [remoteCursors, setRemoteCursors] = useState(new Map());
  const pendingBroadcastRef = useRef([]);
  const isPanning = useRef(false);

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 10;
  const ZOOM_SPEED = 1.1;

  const cursorColorsRef = useRef(new Map());
  const [buttonActive, setButtonActive] = useState(null);
  const isDrawingTool =
    ActiveTool && ActiveTool !== "selection" && ActiveTool !== "";

  const getStorageKey = (roomId) =>
    roomId ? `canvas:room:${roomId}` : `canvas:draft`;

  const isTransformerActive = () =>
    trRef.current && trRef.current.nodes().length > 0;

  /*______________________________________

            useEffects
______________________________________*/
  // Add state for stage dimensions
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
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
  const lastCursorSentRef = useRef(0);

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
  useEffect(() => {
    if (!ActiveTool?.payload) return;

    if (ActiveTool.type === "image") {
      const { src, width, height } = ActiveTool.payload;

      const id = crypto.randomUUID();

      const imageShape = {
        id,
        type: "image",
        x: 100,
        y: 100,
        width,
        height,
        src,
        draggable: false,
        deleted: false,
        version: 1,
      };

      setShapes((prev) => {
        const next = [...prev, imageShape];
        broadCasteShapeUpdate(next);
        return next;
      });

      setPendingid([id]);
      setActiveTool("selection"); // reset tool
    }
  }, [ActiveTool]);

  useEffect(() => {
    const key = getStorageKey(roomInfo?.roomId);
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.shapes)) {
        setShapes(data.shapes);
      }
    } catch (e) {
      console.error("Could'nt getItem from localStorage", e);
    }
  }, [roomInfo?.roomId]);

  useEffect(() => {
    const key = getStorageKey(roomInfo?.roomId);

    const id = setTimeout(() => {
      localStorage.setItem(
        key,
        JSON.stringify({
          shapes: Shapes.filter((s) => !s.isPreview),
          updatedAt: Date.now(),
        }),
      );
    }, 300);

    return () => clearTimeout(id);
  }, [Shapes, roomInfo?.roomId]);

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

      setShapes((prevShapes) => {
        const shapeMap = new Map(prevShapes.map((s) => [s.id, s]));

        remoteShapes.forEach((remoteShape) => {
          const existing = shapeMap.get(remoteShape.id);

          shapeMap.set(remoteShape.id, {
            ...existing, // ✅ keep all original properties (type, stroke, width, etc.)
            ...remoteShape, // ✅ overlay only what changed (x, y)
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
    if (now - lastCursorSentRef.current < CURSOR_INTERVAL) return;

    lastCursorSentRef.current = now;
    const encryptedBlob = await encryptData(JSON.stringify({ x, y, userName }));

    socket.send(
      buildFrame({
        type: "MOUSE_LOCATION",
        encryptedData: encryptedBlob,
      }),
    );
  };

  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    // send a zero-move cursor update
    sendCursorPosition(lastPos.current?.x ?? 0, lastPos.current?.y ?? 0);
  }, [userName]);

  const handleShapeDragMove = (id, pos) => {
    const now = performance.now();
    if (now - lastDragSentRef.current < CURSOR_INTERVAL) return;

    lastDragSentRef.current = now;

    const tempShape = {
      id,
      x: pos.x,
      y: pos.y,
      isPreview: true,
      version: 0,
    };

    broadCasteShapeUpdate([tempShape], true);
  };

  const handleShapeDragEnd = (id, pos) => {
    setShapes((prev) => {
      const updated = prev.map((s) =>
        s.id === id
          ? {
            ...s,
            x: pos.x,
            y: pos.y,
            version: (s.version || 0) + 1,
            versionNonce: Math.random(),
          }
          : s,
      );

      broadCasteShapeUpdate(updated.filter((s) => s.id === id));

      return updated;
    });
  };

  const getCursorColor = (id) => {
    if (!cursorColorsRef.current.has(id)) {
      // eslint-disable-next-line react-hooks/purity
      const h = Math.floor(Math.random() * 360);
      const color = `hsl(${h}, 80%, 55%)`;
      cursorColorsRef.current.set(id, color);
    }
    return cursorColorsRef.current.get(id);
  };
  useEffect(() => {
    Array.from(remoteCursors.values()).forEach((cursor) => {
      console.log(cursor.userName);
    });
  }, [remoteCursors]);

  const handleRemoteMouseLocation = (payload) => {
    setRemoteCursors((prev) => {
      const next = new Map(prev);

      next.set(payload.userId, {
        x: payload.x,
        y: payload.y,
        userName: payload.userName,
        lastSeen: Date.now(),
      });

      return next;
    });
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

  const handleWebsocketMessgae = (type, decryptedPayload) => {
    // console.log("RECEIVED TYPE:", type, decryptedPayload);

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
      handleWebsocketMessgae(type, decryptedPayload);
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

  /* Handling Mouse Delete if inActivity for 3 second */
  // setTimeout(() => {
  //   setRemoteCursors((prev) => {
  //     const next = new Map(prev);
  //     next.delete(payload.userId);
  //     return next;
  //   });
  // }, 3000);
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
  /* ________________________________
 
    Transformer Handlers
    
 _________________________________*/

  const handleTransformPreview = () => {
    const nodes = trRef.current?.nodes();
    if (!nodes || nodes.length === 0) return;

    const now = performance.now();
    if (now - lastDragSentRef.current < CURSOR_INTERVAL) return;
    lastDragSentRef.current = now;

    const previewShapes = nodes.map((node) => {
      const attrs = node.getAttrs();
      return {
        id: attrs.id,
        x: attrs.x,
        y: attrs.y,
        width: attrs.width,
        height: attrs.height,
        radiusX: attrs.radiusX,
        radiusY: attrs.radiusY,
        points: attrs.points,
        scaleX: attrs.scaleX,
        scaleY: attrs.scaleY,
        rotation: attrs.rotation,
        offsetX: attrs.offsetX,
        offsetY: attrs.offsetY,
        isPreview: true,
        version: 0,
      };
    });

    broadCasteShapeUpdate(previewShapes, true);
  };

  const handleTransformEnd = () => {
    const nodes = trRef.current?.nodes();
    if (!nodes || nodes.length === 0) return;

    const transformedIds = new Set(nodes.map((n) => n.id()));

    setShapes((prev) => {
      const updated = prev.map((s) => {
        if (!transformedIds.has(s.id)) return s;

        const node = shapeRef.current[s.id];
        if (!node) return s;

        const attrs = node.getAttrs();
        return {
          ...s,
          x: attrs.x,
          y: attrs.y,
          width: attrs.width,
          height: attrs.height,
          radiusX: attrs.radiusX,
          radiusY: attrs.radiusY,
          points: attrs.points,
          scaleX: attrs.scaleX,
          scaleY: attrs.scaleY,
          rotation: attrs.rotation,
          offsetX: attrs.offsetX,
          offsetY: attrs.offsetY,
          isPreview: false,
          version: (s.version || 0) + 1,
          versionNonce: Math.random(),
        };
      });

      const changed = updated.filter((s) => transformedIds.has(s.id));
      broadCasteShapeUpdate(changed);

      return updated;
    });
  };
  const transformerRef = (id) => {
    const tr = trRef.current;
    const node = shapeRef.current[id];
    if (!tr || !node) return;

    const layer = node.getLayer();
    if (!layer) return;

    // 🔒 disable dragging on ALL shapes
    Object.values(shapeRef.current).forEach((n) => {
      n.draggable(false);
    });

    // 🔓 enable dragging ONLY on selected node
    node.draggable(true);

    tr.nodes([node]);
    layer.batchDraw();
  };

  /* ____________________________________________________________

                    Handling Soft Delete-Shape 
                    
_______________________________________________________________*/

  useEffect(() => {
    if (!pendingBroadcastRef.current.length) return;
    if (!socket || socket.readyState !== WebSocket.OPEN || !cryptoKey) return;

    broadCasteShapeUpdate(pendingBroadcastRef.current);
    pendingBroadcastRef.current = [];
  }, [Shapes, socket, cryptoKey]);

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

  /* ________________________________

  KeyBoard Handling
  
_________________________________*/
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (ActiveTool !== "hand") {
      isPanning.current = false;
    }
    const cursor = ActiveTool === "hand" ? "grab" : "default";
    stage.container().style.cursor = cursor;
  }, [ActiveTool]);

 useEffect(() => {
  const handleKeyDown = (e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    
    if (isCtrlOrCmd && e.key.toLowerCase() === "a") {
      e.preventDefault();
      
      const transformer = trRef.current;
      const layer = layerRef.current;
      
      if (!transformer || !layer) return;
      
      // Select all shapes with class 'shape'
      const allShapes = layer.find('.shape');
      
      transformer.nodes(allShapes);
      layer.batchDraw();
    }
  };
  
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);  useEffect(() => {
    const down = (e) => {
      if (e.key === "Shift") {
        isShiftPressed.current = true;
        handleUpdateShape();
      }
      if (e.key === " " && !isDrawing.current) {
        isPanning.current = true;
        if (stageRef.current) {
          stageRef.current.container().style.cursor = "grab";
        }
      }
    };
    const up = (e) => {
      if (e.key === "Shift") {
        isShiftPressed.current = false;
        handleUpdateShape();
      }
      if (e.key === " ") {
        isPanning.current = false;
        if (stageRef.current) {
          stageRef.current.container().style.cursor = "default";
        }
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /* _____________________________________

             Handling All MouseEvents 
________________________________________*/

  useEffect(() => {
    const isDrawingTool =
      ActiveTool && ActiveTool !== "selection" && ActiveTool !== "";

    Object.values(shapeRef.current).forEach((node) => {
      node.listening(!isDrawingTool); // 🔥 KEY FIX
      node.draggable(false);
    });

    if (isDrawingTool) {
      trRef.current?.nodes([]);
      trRef.current?.getLayer()?.batchDraw();
    }
  }, [ActiveTool]);

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    if (ActiveTool === "hand") {
      isPanning.current = true;
      stage.container().style.cursor = "grabbing";
      return;
    }
    const clickedOnEmpty = e.target === stage;

    if (clickedOnEmpty && trRef.current && trRef.current.nodes().length > 0) {
      const pointer = stage.getPointerPosition();
      const trNodes = trRef.current.nodes();

      // Get the combined bounding box of all selected nodes
      const box = trRef.current.getClientRect();

      if (
        pointer.x >= box.x &&
        pointer.x <= box.x + box.width &&
        pointer.y >= box.y &&
        pointer.y <= box.y + box.height
      ) {
        // Click is INSIDE the transformer box — don't deselect,
        // and don't start drawing. Just let drag handle it.
        // Enable dragging on the selected nodes so mouseMove can move them.
        trNodes.forEach((node) => {
          node.draggable(true);
        });

        // Manually kick off a drag on the first selected node
        // by forwarding the native event position
        const node = trNodes[0];
        node.startDrag(e.evt);
        return; // ← STOP here, don't fall through
      }
    }
    if (clickedOnEmpty) {
      trRef.current.nodes([]);

      // 🔒 disable dragging on all shapes
      Object.values(shapeRef.current).forEach((node) => {
        node.draggable(false);
      });

      trRef.current.getLayer()?.batchDraw();
    }
    if (ActiveTool === "selection" && isTransformerActive()) {
      return;
    }
    if (ActiveTool == "") return;
    const point = stage.getPointerPosition();

    const transform = stage.getAbsoluteTransform().copy().invert();
    const canvasPoint = transform.point(point);
    startPos.current = { x: canvasPoint.x, y: canvasPoint.y };
    currentDrawingIdRef.current = crypto.randomUUID();

    if (ActiveTool === "eraser") {
      isDrawing.current = true;
      setIsEraserEnable(true);
      isErasingRef.current = true;
      erasedIdsRef.current.clear();

      const eraserBox = new Konva.Circle({
        x: canvasPoint.x,
        y: canvasPoint.y,
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
          x: canvasPoint.x,
          y: canvasPoint.y,
          width: 0,
          height: 0,
          stroke: "white",
          listening: false,
          draggable: false,
        });
        break;
      case "selection":
        previewNodeRef.current = new Konva.Rect({
          x: canvasPoint.x,
          y: canvasPoint.y,
          width: 0,
          height: 0,
          stroke: "#FF2A6D",
          listening: false,
          draggable: false,
        });
        break;
      case "elipse":
        previewNodeRef.current = new Konva.Ellipse({
          type: "elipse",
          x: canvasPoint.x,
          y: canvasPoint.y,
          radiusX: 0,
          radiusY: 0,
          stroke: "white",
          listening: false,
          draggable: false,
        });
        break;

      case "arrow":
        previewNodeRef.current = new Konva.Arrow({
          type: "arrow",
          points: [canvasPoint.x, canvasPoint.y, canvasPoint.x, canvasPoint.y],
          listening: false,
          stroke: "white",
          draggable: false,
        });
        break;
      case "pencil":
        previewNodeRef.current = new Konva.Line({
          type: "pencil",
          points: [canvasPoint.x, canvasPoint.y],
          stroke: "white",
          strokeWidth: "2",
          lineCap: "round",
          lineJoin: "round",
          listening: false,
          draggable: false,
          tension: 0.2,
          hitStrokeWidth: 10,
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
      const stage = layerRef.current?.getStage();
      if (!stage) return;

      const rect = stage.container().getBoundingClientRect();
      const pos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      const transform = stage.getAbsoluteTransform().copy().invert();
      const canvasPos = transform.point(pos);

      // ALWAYS sync cursor
      sendCursorPosition(canvasPos.x, canvasPos.y);
      lastPos.current = canvasPos;

      // PANNING
      if (isPanning.current && e.buttons === 1) {
        setStagePosition((prev) => ({
          x: prev.x + e.movementX,
          y: prev.y + e.movementY,
        }));
        return;
      }

      // DRAW / ERASE
      if (!isDrawing.current || !previewNodeRef.current || ActiveTool === "")
        return;

      if (ActiveTool === "eraser" && isErasingRef.current) {
        previewNodeRef.current.setAttrs({ x: canvasPos.x, y: canvasPos.y });

        // Hit detection: check all shapes against the eraser circle
        const eraserRect = previewNodeRef.current.getClientRect();
        layerRef.current.find(".shape").forEach((node) => {
          if (Konva.Util.haveIntersection(eraserRect, node.getClientRect())) {
            if (!erasedIdsRef.current.has(node.id())) {
              erasedIdsRef.current.add(node.id());
              node.opacity(0.3); // visual feedback while erasing
            }
          }
        });

        layerRef.current.batchDraw();
        return;
      }

      // ✅ CORRECT
      switch (ActiveTool) {
        case "rect":
        case "selection":
          handleRect(canvasPos, startPos.current.x, startPos.current.y); // ✅
          break;
        case "elipse":
          handleElipse(canvasPos, startPos.current.x, startPos.current.y); // ✅
          break;
        case "arrow":
          handleArrow(canvasPos, startPos.current.x, startPos.current.y); // ✅
          break;
        case "pencil":
          handlePencil(canvasPos); // ✅
          break;
      }
      layerRef.current.batchDraw();

      // Broadcast preview
      if (
        previewNodeRef.current &&
        ActiveTool !== "selection" &&
        ActiveTool !== "eraser"
      ) {
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
    const handleMouseUp = async () => {
      if (isPanning.current && ActiveTool === "hand") {
        const stage = stageRef.current;
        isPanning.current = false;
        stage.container().style.cursor = "grab";
        return;
      }
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
      const id = currentDrawingIdRef.current;
      const Name = "shape";
      const newShape = {
        ...attrs,
        id,
        Name,
        type: ActiveTool,
        draggable: false,
        listening: true,
        deleted: false,
        version: 1,
        versionNonce: Math.random(),
        isPreview: false,
        ...(ActiveTool === "pencil" && {
          hitStrokeWidth: 10,
          strokeWidth: 2,
        }),
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
      currentDrawingIdRef.current = null;
      setActiveTool("selection");
      setPointerEvent("");
    };

    const handleGlobalMouseUp = () => {
      if (isDrawing.current) {
        handleMouseUp();
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [ActiveTool, Shapes, userName]); // Add dependencies as needed

  const handleWheel = (e) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const delta = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, oldScale * (delta > 0 ? ZOOM_SPEED : 1 / ZOOM_SPEED)),
    );

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePosition(newPos);
  };

  const zoomIn = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const newScale = Math.min(MAX_SCALE, oldScale * ZOOM_SPEED);

    // Zoom to center
    const center = {
      x: stage.width() / 2,
      y: stage.height() / 2,
    };
    const mousePointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePosition(newPos);
  };

  const zoomOut = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const newScale = Math.max(MIN_SCALE, oldScale / ZOOM_SPEED);

    const center = {
      x: stage.width() / 2,
      y: stage.height() / 2,
    };

    const mousePointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    };

    setStageScale(newScale);
    setStagePosition(newPos);
  };

  const resetZoom = () => {
    setStageScale(1);
    setStagePosition({ x: 0, y: 0 });
  };
  /*___________________________________
 
    Rendering Canvas & Drawing
_____________________________________*/
  return (
    <div
      className="Canvas-wrapper"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000014",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          backgroundColor: "#141414",
          padding: "8px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          pointerEvents: pointerEvent,
        }}
      >
        <button
          onMouseDown={() => {
            setButtonActive("in");
            zoomIn();
          }}
          onMouseUp={() => setButtonActive(null)}
          className={
            buttonActive === "in" ? "zoom-in-btn active" : "zoom-in-btn"
          }
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "18px",
          }}
          title="Zoom In (Ctrl + Mouse Wheel)"
        >
          <span style={{ color: "#EBE0BB", fontSize: 18 }}>+</span>
        </button>
        <button
          onClick={resetZoom}
          style={{
            width: "50px",
            padding: "4px 8px",
            borderRadius: "4px",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
          }}
          title="Reset Zoom (100%)"
        >
          <span style={{ color: "#05D9E7", fontSize: "1rem" }}>
            {Math.round(stageScale * 100)}%
          </span>
        </button>
        <button
          onMouseDown={() => {
            setButtonActive("out");
            zoomOut();
          }}
          onMouseUp={() => setButtonActive(null)}
          className={
            buttonActive === "out" ? "zoom-out-btn active" : "zoom-out-btn"
          }
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "18px",
          }}
          title="Zoom Out (Ctrl + Mouse Wheel)"
        >
          <span style={{ color: "#EBE0BB", fontSize: 18 }}>-</span>
        </button>
      </div>

      <Stage
        ref={stageRef}
        width={stageDimensions.width}
        height={stageDimensions.height}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        draggable={false}
      >
        <Layer ref={layerRef}>
          {Shapes.filter((s) => !s.deleted).map((shape) => {
            return (
              <RenderShape
                key={shape.id}
                shape={shape}
                RegisterRef={RegisterRef}
                transformerRef={transformerRef}
                onDragMove={handleShapeDragMove}
                onDragEnd={handleShapeDragEnd}
                canInteract={!isDrawingTool}
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
            onTransform={handleTransformPreview}
            onTransformEnd={handleTransformEnd}
          />
          {Array.from(remoteCursors.entries()).map(([id, cursor]) => {
            const color = getCursorColor(id);

            return (
              <Group key={id} x={cursor.x} y={cursor.y} listening={false}>
                <Arrow
                  points={[0, 10, 1, 1]} // almost no line
                  pointerLength={16}
                  pointerWidth={10}
                  fill={color}
                  strokeWidth={1}
                  rotation={-35}
                />

                <Rect
                  x={15}
                  y={12}
                  width={cursor.userName.length * 7 + 8}
                  height={16}
                  cornerRadius={4}
                  stroke={color}
                  opacity={0.9}
                />

                {/* text */}
                <Text
                  x={15}
                  y={12}
                  width={cursor.userName.length * 7 + 8}
                  height={16}
                  text={cursor.userName}
                  fontSize={11}
                  fontStyle="bold"
                  fill="#FFFFFF"
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
