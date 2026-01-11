import { Fragment } from "react";
import { Arrow, Circle, Ellipse, Line, Rect } from "react-konva";

const RenderShape = ({ shape, RegisterRef, transformerRef }) => {
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
          stroke="black"
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
          stroke="black"
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
          stroke="black"
          draggable
        />
      );
    case "pencil":
      return (
        <Line
          {...shape}

          ref={(node) => RegisterRef(shape.id, node)}
          onClick={() => {
            transformerRef(shape.id);
          }}
          stroke="black"

          draggable
        />
      );

    default:
      return null;
  }
};
export default RenderShape;
