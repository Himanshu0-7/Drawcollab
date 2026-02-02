import { useEffect, useRef, useState } from "react";
import { Arrow, Ellipse, Image, Line, Rect } from "react-konva";

const RenderShape = ({
  shape,
  RegisterRef,
  transformerRef,
  onDragMove,
  onDragEnd,
  canInteract,
}) => {
  const imageRef = useRef(null);
  const [imgElement, setImgElement] = useState(null);

  // load image
  useEffect(() => {
    if (shape.type !== "image") return;

    const img = new window.Image();
    img.src = shape.src;

    img.onload = () => {
      setImgElement(img);
      imageRef.current?.getLayer()?.batchDraw();
    };
  }, [shape.src]);

  const commonProps = {
    ref: (node) => RegisterRef(shape.id, node),
    listening: canInteract,
    draggable: false,
    onclick: (e) => {
      if (!canInteract) {
        e.cancelBubble = true;
        return;
      }
      transformerRef(shape.id);
    },
    onDragMove: (e) => {
      onDragMove(shape.id, e.target.position());
    },
    onDragEnd: (e) => {
      onDragEnd(shape.id, e.target.position());
    },
  };

  switch (shape.type) {
    case "rect":
      return <Rect {...shape} {...commonProps} stroke="white" />;

    case "elipse":
      return <Ellipse {...shape} {...commonProps} stroke="white" />;

    case "arrow":
      return <Arrow {...shape} {...commonProps} stroke="white" />;

    case "pencil":
      return <Line {...shape} {...commonProps} stroke="white" />;

    case "image":
      return (
        <Image
          {...commonProps}
          ref={(node) => {
            imageRef.current = node;
            RegisterRef(shape.id, node);
          }}
          image={imgElement}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
        />
      );

    default:
      return null;
  }
};

export default RenderShape;
