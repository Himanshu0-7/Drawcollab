import { Fragment } from "react";
import { Arrow, Circle, Ellipse, Rect } from "react-konva";

const RenderShape = ({ shape, RegisterRef, isPreview, transformerRef }) => {
  switch (shape.type) {
    case "rect":
      return (
        <Rect
          {...shape}
          ref={(node) => {
            RegisterRef(shape.id, node);
          }}
          onClick={() => {
            transformerRef(shape.id);
          }}
          stroke={"black"}
          strokeWidth={1}
          draggable
        />
      );
    case "elipse":
      return (
        <Ellipse
          {...shape}
          ref={(node) => RegisterRef(shape.id, node)}
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
          {...shape}
          ref={(node) => RegisterRef(shape.id, node)}
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
