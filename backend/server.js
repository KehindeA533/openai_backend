// Import required modules
import express from "express"; // Web framework for building the server
import dotenv from "dotenv"; // Loads environment variables from a .env file
import cors from "cors"; // Middleware for enabling Cross-Origin Resource Sharing
import rateLimit from "express-rate-limit";

// Load environment variables from the .env file
dotenv.config();

const API_KEYS = process.env.API_KEYS;
const PORT = process.env.PORT || 3001;

// Create an instance of the Express application
const app = express();

// Step 1: Apply CORS middleware globally
// This allows specific origins to access the server resources
const allowedOrigins =
  process.env.RAILWAY_ENVIRONMENT_NAME === "production"
    ? ["https://ai-voice-agent-v0-1.vercel.app"]
    : ["http://localhost:3001", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed!"));
      }
    },
  })
);

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 requests per minute per IP
  message: { error: "Too many concurrent requests. Please try again later." },
});

app.use(limiter);

// API Key middleware to secure the /session endpoint
const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(403).json({ error: "Forbidden: Invalid API Key" });
  }
  next();
};

// Apply the API key middleware for the /session route
app.use("/session", apiKeyMiddleware);

// Step 2: Define the /session route
// This route interacts with the OpenAI Realtime API to create a new session
app.get("/session", async (req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "ballad",
      }),
    });

    if (!r.ok) {
      throw new Error(`OpenAI API Error: ${r.status} ${r.statusText}`);
    }

    const data = await r.json();
    res.send(data);
  } catch (error) {
    console.error("Error creating session:", error);
    res
      .status(500)
      .send({ error: error.message || "Failed to create session" });
  }
});

// Define the /getEKey route to fetch the OpenAI ephemeral key from the backend
app.get("/getEKey", async (req, res) => {
  try {
    const tokenResponse = await fetch(
      "https://openaibackend-production.up.railway.app/session",
      {
        headers: { "x-api-key": API_KEYS },
      }
    );

    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    res.json({ ephemeralKey: EPHEMERAL_KEY });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: error.message || "Error !!" });
  }
});

// Step 3: Start the server
// This starts the server and listens on the designated port for incoming requests
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
