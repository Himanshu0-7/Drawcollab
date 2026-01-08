
import Home from "./Home";
import { Route, Routes } from "react-router-dom";
import Room from "./Room";
import'./Shared.css'
import { useState } from "react";
function App() {
  // const send = () => {
  //   if (!text || !wsRef.current) return;

  //   wsRef.current?.send(
  //     JSON.stringify({
  //       type: "chat",
  //       to: to,
  //       text: text,
  //     })
  //   );
  //   document.getElementById("message").value = "";
  //   settext("");
  // };
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/room/:roomId"
          element={<Room/>}
        />
      </Routes>
    </>
  );
}

export default App;
