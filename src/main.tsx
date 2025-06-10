import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Import utilities for browser console debugging
import "./utils/firebaseAuthCleanup";
import "./utils/testUserCreation";

createRoot(document.getElementById("root")!).render(<App />);
