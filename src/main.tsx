import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import App from "./App.tsx";
import Feeds from "./Feeds.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import LandingPage from "./LandingPage.tsx";
import NotFoundPage from "./NotFoundPage.tsx";
import withAutoLogout from "./AutoLogout.tsx";

Amplify.configure(outputs);

const AutoLogoutApp = withAutoLogout(() => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/deals" element={<App />} />
    <Route path="/feeds" element={<Feeds />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <AutoLogoutApp />
    </Router>
  </React.StrictMode>
);
