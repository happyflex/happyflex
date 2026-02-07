import React from "react";
import "./App.css";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import Header from "./components/Header";
import Canvas from "./components/Canvas";
import BottomToolbar from "./components/BottomToolbar";
import RightSidebar from "./components/RightSidebar";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <WorkspaceProvider>
      <div className="App h-screen flex flex-col bg-[#0a1628] overflow-hidden">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Canvas />
          <RightSidebar />
        </div>
        <BottomToolbar />
        <Toaster />
      </div>
    </WorkspaceProvider>
  );
}

export default App;
