import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initAnalytics } from "./hooks/useAnalytics";
import { initSentry } from "./services/sentry";

import "./styles/global.css";

// Initialize monitoring and analytics
initSentry();
initAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
