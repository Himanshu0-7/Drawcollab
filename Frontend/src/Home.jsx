import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import Session from "./Session";
import Canvas from "./Canvas";

const Home = () => {
  const [isshare, setIshare] = useState(0);
  const [ActiveTool, setActiveTool] = useState('');

  const shareBtn = () => {
    setIshare((prev) => (prev === 0 ? 1 : 0));
  };

  return (
    <>
      <Navbar
        shareBtn={shareBtn}
        setActiveTool={setActiveTool}
        ActiveTool={ActiveTool}
      ></Navbar>
      <Canvas ActiveTool={ActiveTool}></Canvas>
      <Session isloading={isshare}></Session>
    </>
  );
};
export default Home;
