import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Optional MySQL Connection for cPanel
let pool: any = null;
if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log("MySQL Pool created for cPanel deployment.");
  } catch (error) {
    console.error("Failed to create MySQL pool:", error);
  }
}

async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not configured");
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const data = await response.json() as any;
  return data.access_token;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Socket.io logic
  const userSockets = new Map<string, string>(); // userId -> socketId

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user_online", (userId) => {
      userSockets.set(userId, socket.id);
      socket.data.userId = userId;
      io.emit("user_status_change", { userId, status: "online" });
    });

    socket.on("join_chat", (chatId) => {
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });

    socket.on("send_message", (data) => {
      // data: { chatId, senderId, receiverId, text, createdAt }
      io.to(data.chatId).emit("receive_message", data);
      
      // Send notification to receiver if not in chat
      io.emit("notification", {
        receiverId: data.receiverId,
        type: "message",
        senderId: data.senderId,
        chatId: data.chatId,
        text: data.text
      });
    });

    socket.on("typing", (data) => {
      socket.to(data.chatId).emit("user_typing", data);
    });

    socket.on("recording_audio", (data) => {
      socket.to(data.chatId).emit("user_recording", data);
    });

    socket.on("message_seen", (data) => {
      socket.to(data.chatId).emit("message_status_update", { ...data, status: 'seen' });
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      if (userId) {
        userSockets.delete(userId);
        io.emit("user_status_change", { userId, status: "offline", lastSeen: new Date().toISOString() });
      }
      console.log("User disconnected");
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "HeartConnect API is running",
      db: pool ? "mysql" : "firebase-only"
    });
  });

  app.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { amount } = req.body;
      const accessToken = await getPayPalAccessToken();
      const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: amount,
              },
            },
          ],
        }),
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('PayPal Create Order Error:', error);
      res.status(500).json({ error: 'Failed to create PayPal order' });
    }
  });

  app.post("/api/paypal/capture-order", async (req, res) => {
    try {
      const { orderID } = req.body;
      const accessToken = await getPayPalAccessToken();
      const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('PayPal Capture Order Error:', error);
      res.status(500).json({ error: 'Failed to capture PayPal order' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
