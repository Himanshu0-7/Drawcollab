import { Fragment } from "react";
import { Arrow, Circle, Ellipse, Rect } from "react-konva";

const RenderShape = ({ shape, RegisterRef, isPreview, transformerRef }) => {
  console.log(shape);
  switch (shape.type) {
    case "rect":
      return (
        <Rect
          key={shape.id}
          {...shape}
          ref={isPreview ? undefined : (node) => RegisterRef(shape.id, node)}
          onClick={() => {
            transformerRef(shape.id);
          }}
          stroke={isPreview ? "black" : "black"}
          strokeWidth={1}
          draggable
        />
      );
    case "elipse":
      return (
        <Ellipse
          key={shape.id}
          {...shape}
          ref={isPreview ? undefined : (node) => RegisterRef(shape.id, node)}
          onClick={() => {
            transformerRef(shape.id);
          }}
          stroke={isPreview ? "green" : "black"}
          strokeWidth={1}
          draggable
        />
      );
    case "arrow":
      return (
        <Arrow
          key={shape.id}
          {...shape}
          ref={isPreview ? undefined : (node) => RegisterRef(shape.id, node)}
          onClick={() => {
            transformerRef(shape.id);
          }}
          stroke={isPreview ? "green" : "black"}
          draggable
        />
      );

    default:
      return null;
  }
};
export default RenderShape;
