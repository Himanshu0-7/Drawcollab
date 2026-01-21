// Add state for stage dimensions
const [stageDimensions, setStageDimensions] = useState({
  width: window.innerWidth,
  height: window.innerHeight,
});

// Update dimensions on resize
useEffect(() => {
  const handleResize = () => {
    setStageDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

// Add global mouse listeners
useEffect(() => {
  const handleGlobalMouseMove = (e) => {
    if (!isDrawing.current || ActiveTool === "" || !previewNodeRef.current)
      return;

    const stage = layerRef.current?.getStage();
    if (!stage) return;

    // Get mouse position relative to the stage
    const rect = stage.container().getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    lastPos.current = pos;
    sendCursorPosition(pos.x, pos.y);

    // Handle eraser
    if (ActiveTool === "eraser" && isErasingRef.current) {
      previewNodeRef.current.setAttrs({ x: pos.x, y: pos.y });
      const box = previewNodeRef.current.getClientRect();
      const selectedNodes = layerRef.current
        .find(".shape")
        .filter((node) =>
          Konva.Util.haveIntersection(box, node.getClientRect()),
        );
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
}, [ActiveTool, Shapes]); // Add dependencies as needed
