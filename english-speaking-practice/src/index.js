// src/index.js

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// The root element is defined in public/index.html (usually with id "root")
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
