import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./index.css";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import LandingPage from "./LandingPage.tsx";
import NotFoundPage from "./NotFoundPage.tsx";
import withAutoLogout from "./AutoLogout.tsx";
import ChatPage from "./ChatPage.tsx";

Amplify.configure(outputs);

const AutoLogoutApp = withAutoLogout(() => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/chat" element={<ChatPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router basename="/">
      <AutoLogoutApp />
    </Router>
  </React.StrictMode>
);
