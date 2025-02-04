// Import required modules for the application

// Express is a popular web framework for building APIs and web servers.
import express from "express";

// dotenv loads environment variables from a .env file into process.env.
import dotenv from "dotenv";

// cors is middleware that enables Cross-Origin Resource Sharing, allowing your server to handle requests from different origins.
import cors from "cors";

// express-rate-limit is used to limit repeated requests to public APIs and endpoints.
import rateLimit from "express-rate-limit";

// Load environment variables from the .env file into process.env.
dotenv.config();

// Retrieve the API keys from environment variables.
// This variable will be used to validate incoming requests.
const API_KEYS = process.env.API_KEYS;

// Set the port on which the server will listen. Use the PORT environment variable if available, otherwise default to 3001.
const LOCAL_HOST_PORT = process.env.LOCAL_HOST_PORT;
const PROD_PORT = process.env.PORT || LOCAL_HOST_PORT;

const PORT = railway_env === "production" ? PROD_PORT : LOCAL_HOST_PORT;

// Create an instance of the Express application.
const app = express();

// ============================================================================
// STEP 1: Set up Middleware
// ============================================================================

// Determine which origins are allowed to access the server.
// If the app is running in a production environment, only allow the production domain.
// Otherwise, allow localhost origins for development.
const allowedOrigins =
    process.env.RAILWAY_ENVIRONMENT_NAME === "production"
        ? ["https://ai-voice-agent-v0-1.vercel.app"]  // Production domain
        : [ `http://localhost:${LOCAL_HOST_PORT}`];  // Development domains

// Apply CORS middleware globally with a custom origin checking function.
app.use(
    cors({
        origin: (origin, callback) => {
            // If the request has no origin (e.g., a same-origin request) or if the origin is in the allowed list, allow the request.
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                // If the origin is not allowed, return an error.
                callback(new Error("Not allowed!"));
            }
        }
    })
);

// Set up rate limiting to restrict clients to a maximum of 5 requests per minute per IP.
// This helps prevent abuse or accidental overload of the server.
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window (in milliseconds)
    max: 5, // Limit each IP to 5 requests per windowMs
    // Message sent back when a client exceeds the limit.
    message: { error: "Too many concurrent requests. Please try again later." },
});

// Apply the rate limiting middleware to all incoming requests.
app.use(limiter);

// Define middleware to validate the API key provided in request headers.
const apiKeyMiddleware = (req, res, next) => {
    // Extract the API key from the custom header 'x-api-key'.
    const apiKey = req.headers["x-api-key"];
    // Check if an API key is provided and if it exists in the allowed API_KEYS.
    if (!apiKey || !API_KEYS.includes(apiKey)) {
        // If the API key is missing or invalid, respond with a 403 Forbidden error.
        return res.status(403).json({ error: "Forbidden: Invalid API Key" });
    }
    // If the API key is valid, pass control to the next middleware or route handler.
    next();
};

// Apply the API key middleware to any route that starts with "/session".
// This ensures that any requests to these endpoints require a valid API key.
app.use("/session", apiKeyMiddleware);

// ============================================================================
// STEP 2: Define Routes
// ============================================================================

// Define a GET endpoint for "/session" which creates a new session with the OpenAI Realtime API.
app.get("/session", async (req, res) => {
    try {
        // Make a POST request to OpenAI's realtime sessions API.
        const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST", // HTTP POST method to create a new session
            headers: {
                // Include the OpenAI API key in the Authorization header.
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json", // Specify that the body is in JSON format
            },
            // Send the required parameters for session creation (model and voice) in the request body.
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview", // The model to be used for the session
                voice: "ballad", // The voice configuration for the session
            }),
        });
        
        // If the response is not successful (status not in the 200 range), throw an error.
        if (!r.ok) {
            throw new Error(`OpenAI API Error: ${r.status} ${r.statusText}`);
        }
        
        // Parse the JSON response from the OpenAI API.
        const data = await r.json();
        // Send the parsed data as the response to the client.
        res.send(data);
    } catch (error) {
        // Log any errors to the server console for debugging.
        console.error("Error creating session:", error);
        // Return a 500 Internal Server Error response with an error message.
        res.status(500).send({ error: error.message || "Failed to create session" });
    }
});

// Define a GET endpoint for "/getEKey" to fetch an ephemeral key from an external backend.
app.get("/getEKey", async (req, res) => {
    try {
        // Fetch an ephemeral key from an external backend service.
        // Pass the API key in the headers for authentication.
        const tokenResponse = await fetch("https://openaibackend-production.up.railway.app/session", {
            headers: { "x-api-key": API_KEYS }
        });

        // Parse the JSON response from the external service.
        const data = await tokenResponse.json();
        // Extract the ephemeral key from the response data.
        const EPHEMERAL_KEY = data.client_secret.value;

        // Respond to the client with the ephemeral key in JSON format.
        res.json({ ephemeralKey: EPHEMERAL_KEY });
        
    } catch (error) {
        // Log any errors that occur during the fetch.
        console.error("Error:", error);
        // Send a 500 error response if something goes wrong.
        res.status(500).send({ error: error.message || "Error !!" });
    }
});

// ============================================================================
// STEP 3: Start the Server
// ============================================================================

// Start the Express server and listen on the specified port for incoming requests.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
