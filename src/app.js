import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express(); // Creating an instance of the express application.

app.use(express.json({ limit: "16kb" }));
// Middleware to parse incoming requests with JSON payloads.
// The limit option specifies the maximum size of the JSON payload that can be sent (16KB).

app.use(express.urlencoded({ extended: true, limit: "16kb" }));
// Middleware to parse incoming requests with URL-encoded payloads (e.g., form submissions).
// The 'extended: true' allows parsing of complex objects, and 'limit' restricts the payload size.

app.use(express.static("public"));
// Middleware to serve static files from the "public" folder (e.g., HTML, CSS, JS files).
// This allows clients to access files such as images and scripts without needing additional routes.

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // Allows requests only from the specified origin (configured in environment variables).
    credentials: true, // Allows cookies to be sent and received with cross-origin requests (useful for authentication).
  })
);
// Middleware to enable Cross-Origin Resource Sharing (CORS) and control which domains can make requests to this server.

app.use(cookieParser());
// Middleware to parse cookies attached to incoming requests and populate req.cookies with the parsed cookies.

export default app;
