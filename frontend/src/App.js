// STEWARD system check – no functional change
import React from "react";
import "./App.css";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { TrashProvider } from "./context/TrashContext";
import { ItemActionProvider } from "./context/ItemActionContext";
import { ConvertTraceProvider } from "./context/ConvertTraceContext";
import { UndoProvider } from "./context/UndoContext";
import Header from "./components/Header";
import Canvas from "./components/Canvas";
import BottomToolbar from "./components/BottomToolbar";
import RightSidebar from "./components/RightSidebar";
import CursorHUD from "./components/CursorHUD";
import CommandWheel from "./components/CommandWheel";
import LastSessionOverlay from "./components/LastSessionOverlay";
import ConvertTraceOverlay from "./components/ConvertTraceOverlay";
import GlobalKeyHandler from "./components/GlobalKeyHandler";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <WorkspaceProvider>
      <TrashProvider>
        <UndoProvider>
          <ItemActionProvider>
            <ConvertTraceProvider>
              <div className="App h-screen flex flex-col bg-[#0a1628] overflow-hidden steward-workspace-root">
                <Header />
                <div className="flex-1 flex overflow-hidden">
                  <Canvas />
                  <RightSidebar />
                </div>
                <BottomToolbar />
                <Toaster />
                <CursorHUD />
                <CommandWheel />
                <LastSessionOverlay />
                <ConvertTraceOverlay />
                <GlobalKeyHandler />
                {/* HUD Overlay for Item Mode */}
                <div id="steward-item-hud">
                  <span className="hud-icon" aria-hidden="true" />
                  <span>ITEM MODE ACTIVE</span>
                </div>
                {/* Scanline sweep overlay */}
                <div id="steward-scanline-overlay" aria-hidden="true" />
              </div>
            </ConvertTraceProvider>
          </ItemActionProvider>
        </UndoProvider>
      </TrashProvider>
    </WorkspaceProvider>
  );
}

export default App;
