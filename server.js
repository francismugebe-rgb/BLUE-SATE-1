import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import cors from "cors";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

const JWT_SECRET = process.env.JWT_SECRET || "heartconnect_secret_key_123";

// SQLite fallback
const dbFile = path.join(__dirname, "database.sqlite");
let sqlite = null;

function setupSQLite() {
  sqlite = new Database(dbFile);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      photoURL TEXT,
      bio TEXT,
      city TEXT,
      country TEXT,
      gender TEXT,
      relationshipStatus TEXT,
      interests TEXT,
      points INTEGER DEFAULT 0,
      walletBalance REAL DEFAULT 0.00,
      level TEXT DEFAULT 'Bronze',
      likes TEXT,
      dislikes TEXT,
      matches TEXT,
      role TEXT DEFAULT 'user',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// MySQL Connection
let pool = null;
async function initDB() {
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
      
      // Initialize Tables
      const connection = await pool.getConnection();
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS users (
            uid VARCHAR(255) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            photoURL TEXT,
            bio TEXT,
            city VARCHAR(255),
            country VARCHAR(255),
            gender VARCHAR(50),
            relationshipStatus VARCHAR(50),
            interests JSON,
            points INT DEFAULT 0,
            walletBalance DECIMAL(10, 2) DEFAULT 0.00,
            level VARCHAR(50) DEFAULT 'Bronze',
            likes JSON,
            dislikes JSON,
            matches JSON,
            role VARCHAR(50) DEFAULT 'user',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS transactions (
            id VARCHAR(255) PRIMARY KEY,
            userId VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            type VARCHAR(50) NOT NULL,
            description TEXT,
            status VARCHAR(50) DEFAULT 'completed',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS settings (
            id VARCHAR(255) PRIMARY KEY,
            pointValue DECIMAL(10, 4) DEFAULT 0.01
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS pages (
            id VARCHAR(255) PRIMARY KEY,
            ownerId VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(255),
            followers JSON,
            likes JSON,
            isVerified BOOLEAN DEFAULT FALSE,
            coverUrl TEXT,
            avatarUrl TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ownerId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS groups (
            id VARCHAR(255) PRIMARY KEY,
            ownerId VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            privacy VARCHAR(50) DEFAULT 'public',
            members JSON,
            coverPhoto TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ownerId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(255) PRIMARY KEY,
            userId VARCHAR(255),
            authorName VARCHAR(255),
            title VARCHAR(255),
            description TEXT,
            price DECIMAL(10, 2),
            image TEXT,
            category VARCHAR(255),
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Initialize settings if not exists
        const [settings] = await connection.query("SELECT * FROM settings WHERE id = 'site'");
        if (settings.length === 0) {
          await connection.query("INSERT INTO settings (id, pointValue) VALUES ('site', 0.01)");
        }

        await connection.query(`
          CREATE TABLE IF NOT EXISTS adverts (
            id VARCHAR(255) PRIMARY KEY,
            sponsorId VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            link TEXT NOT NULL,
            type VARCHAR(50) NOT NULL,
            budget DECIMAL(10, 2) NOT NULL,
            spent DECIMAL(10, 2) DEFAULT 0.00,
            clicks INT DEFAULT 0,
            impressions INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'pending',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sponsorId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS posts (
            id VARCHAR(255) PRIMARY KEY,
            userId VARCHAR(255) NOT NULL,
            groupId VARCHAR(255),
            pageId VARCHAR(255),
            content TEXT NOT NULL,
            imageUrl TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE,
            FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE SET NULL,
            FOREIGN KEY (pageId) REFERENCES pages(id) ON DELETE SET NULL
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS reels (
            id VARCHAR(255) PRIMARY KEY,
            userId VARCHAR(255) NOT NULL,
            videoUrl TEXT NOT NULL,
            caption TEXT,
            likes JSON,
            comments JSON,
            views INT DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS comments (
            id VARCHAR(255) PRIMARY KEY,
            targetId VARCHAR(255) NOT NULL,
            userId VARCHAR(255) NOT NULL,
            text TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS likes (
            id VARCHAR(255) PRIMARY KEY,
            targetId VARCHAR(255) NOT NULL,
            userId VARCHAR(255) NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_like (targetId, userId),
            FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(255) PRIMARY KEY,
            receiverId VARCHAR(255) NOT NULL,
            senderId VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            text TEXT,
            isRead BOOLEAN DEFAULT FALSE,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (receiverId) REFERENCES users(uid) ON DELETE CASCADE,
            FOREIGN KEY (senderId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS followers (
            userId VARCHAR(255),
            followerId VARCHAR(255),
            PRIMARY KEY (userId, followerId),
            FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE,
            FOREIGN KEY (followerId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS reports (
            id VARCHAR(255) PRIMARY KEY,
            reporterId VARCHAR(255) NOT NULL,
            targetId VARCHAR(255) NOT NULL,
            targetType VARCHAR(50) NOT NULL,
            reason TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reporterId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS messages (
            id VARCHAR(255) PRIMARY KEY,
            senderId VARCHAR(255) NOT NULL,
            receiverId VARCHAR(255) NOT NULL,
            text TEXT NOT NULL,
            isRead BOOLEAN DEFAULT FALSE,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (senderId) REFERENCES users(uid) ON DELETE CASCADE,
            FOREIGN KEY (receiverId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        await connection.query(`
          CREATE TABLE IF NOT EXISTS reels (
            id VARCHAR(255) PRIMARY KEY,
            userId VARCHAR(255) NOT NULL,
            videoUrl TEXT NOT NULL,
            caption TEXT,
            likes TEXT,
            comments TEXT,
            views INT DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE
          )
        `);

        console.log("MySQL Tables initialized.");
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Failed to initialize MySQL, falling back to SQLite:", error);
      setupSQLite();
    }
  } else {
    console.log("MySQL not configured, using SQLite.");
    setupSQLite();
  }
}

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
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
  const data = await response.json();
  return data.access_token;
}

async function startServer() {
  await initDB();
  
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // Socket.io logic
  const userSockets = new Map(); // userId -> socketId

  io.on("connection", (socket) => {
    socket.on("user_online", (userId) => {
      userSockets.set(userId, socket.id);
      socket.data.userId = userId;
      io.emit("user_status_change", { userId, status: "online" });
    });

    socket.on("send_message", (data) => {
      io.emit("receive_message", data);
      io.emit("notification", {
        receiverId: data.receiverId,
        type: "message",
        senderId: data.senderId,
        text: data.text
      });
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      if (userId) {
        userSockets.delete(userId);
        io.emit("user_status_change", { userId, status: "offline", lastSeen: new Date().toISOString() });
      }
    });
  });

  // --- AUTH ROUTES ---
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = Date.now().toString();
      
      if (pool) {
        await pool.query(
          "INSERT INTO users (uid, email, password, name) VALUES (?, ?, ?, ?)",
          [uid, email, hashedPassword, name]
        );
      } else if (sqlite) {
        sqlite.prepare("INSERT INTO users (uid, email, password, name) VALUES (?, ?, ?, ?)").run(uid, email, hashedPassword, name);
      } else {
        throw new Error("Database not initialized");
      }
      
      const token = jwt.sign({ uid, email, name }, JWT_SECRET);
      res.json({ token, user: { uid, email, name } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed: " + error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      let user;
      if (pool) {
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        user = rows[0];
      } else if (sqlite) {
        user = sqlite.prepare("SELECT * FROM users WHERE email = ?").get(email);
      } else {
        throw new Error("Database not initialized");
      }

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ uid: user.uid, email: user.email, name: user.name }, JWT_SECRET);
      res.json({ token, user: { uid: user.uid, email: user.email, name: user.name, photoURL: user.photoURL } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed: " + error.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      let user;
      if (pool) {
        const [rows] = await pool.query("SELECT uid, email, name, photoURL, bio, role, city, country, gender, relationshipStatus, interests, points FROM users WHERE uid = ?", [req.user.uid]);
        user = rows[0];
      } else if (sqlite) {
        user = sqlite.prepare("SELECT uid, email, name, photoURL, bio, role, city, country, gender, relationshipStatus, interests, points FROM users WHERE uid = ?").get(req.user.uid);
      } else {
        throw new Error("Database not initialized");
      }
      res.json(user);
    } catch (error) {
      console.error("Fetch user error:", error);
      res.status(500).json({ error: "Failed to fetch user: " + error.message });
    }
  });

  app.put("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const { name, photoURL, bio, city, country, gender, relationshipStatus, interests } = req.body;
      await pool.query(
        "UPDATE users SET name = ?, photoURL = ?, bio = ?, city = ?, country = ?, gender = ?, relationshipStatus = ?, interests = ? WHERE uid = ?",
        [name, photoURL, bio, city, country, gender, relationshipStatus, JSON.stringify(interests), req.user.uid]
      );
      res.json({ message: "Profile updated" });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/users/:uid", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT uid, email, name, photoURL, bio, role, city, country, gender, relationshipStatus, interests, points FROM users WHERE uid = ?", [req.params.uid]);
      if (rows.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/users/:uid/followers", async (req, res) => {
    try {
      // For now, we'll just return an empty array or implement a basic followers table
      // In a real app, you'd have a followers table
      const [rows] = await pool.query(`
        SELECT u.uid, u.name, u.photoURL 
        FROM users u 
        JOIN followers f ON u.uid = f.followerId 
        WHERE f.userId = ?
      `, [req.params.uid]);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  });

  // --- SOCIAL ROUTES ---
  app.get("/api/posts", async (req, res) => {
    const { groupId, pageId } = req.query;
    try {
      let query = `
        SELECT p.*, u.name as authorName, u.photoURL as authorPhoto 
        FROM posts p 
        LEFT JOIN users u ON p.userId = u.uid 
      `;
      let params = [];
      
      if (groupId) {
        query += " WHERE p.groupId = ? ";
        params.push(groupId);
      } else if (pageId) {
        query += " WHERE p.pageId = ? ";
        params.push(pageId);
      }
      
      query += " ORDER BY p.createdAt DESC ";
      
      const [rows] = await pool.query(query, params);
      
      const posts = await Promise.all(rows.map(async (post) => {
        const [likes] = await pool.query("SELECT userId FROM likes WHERE targetId = ?", [post.id]);
        const [comments] = await pool.query("SELECT * FROM comments WHERE targetId = ?", [post.id]);
        
        // If post is from a page, we might need to fetch page info for author
        if (post.pageId && !post.authorName) {
          const [pageRows] = await pool.query("SELECT title, avatarUrl FROM pages WHERE id = ?", [post.pageId]);
          if (pageRows.length > 0) {
            post.authorName = pageRows[0].title;
            post.authorPhoto = pageRows[0].avatarUrl;
          }
        }
        
        return {
          ...post,
          likes: likes.map((l) => l.userId),
          comments
        };
      }));
      
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", authenticateToken, async (req, res) => {
    const { content, imageUrl, groupId, pageId } = req.body;
    try {
      const id = Date.now().toString();
      // If pageId is provided, the post is "by the page"
      const userId = pageId ? pageId : req.user.uid;
      
      await pool.query(
        "INSERT INTO posts (id, userId, content, imageUrl, groupId, pageId) VALUES (?, ?, ?, ?, ?, ?)",
        [id, userId, content, imageUrl, groupId || null, pageId || null]
      );
      
      let authorName = req.user.name;
      let authorPhoto = req.user.photoURL;
      
      if (pageId) {
        const [pageRows] = await pool.query("SELECT title, avatarUrl FROM pages WHERE id = ?", [pageId]);
        if (pageRows.length > 0) {
          authorName = pageRows[0].title;
          authorPhoto = pageRows[0].avatarUrl;
        }
      }
      
      res.json({
        id,
        userId,
        content,
        imageUrl,
        groupId,
        pageId,
        authorName,
        authorPhoto,
        likes: [],
        comments: [],
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.post("/api/upload", authenticateToken, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  app.post("/api/reports", authenticateToken, async (req, res) => {
    const { targetId, targetType, reason } = req.body;
    try {
      const id = Date.now().toString();
      await pool.query(
        "INSERT INTO reports (id, reporterId, targetId, targetType, reason) VALUES (?, ?, ?, ?, ?)",
        [id, req.user.uid, targetId, targetType, reason]
      );
      res.json({ message: "Report submitted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  app.post("/api/users/:uid/follow", authenticateToken, async (req, res) => {
    const targetUserId = req.params.uid;
    const followerId = req.user.uid;
    try {
      const [rows] = await pool.query("SELECT * FROM followers WHERE userId = ? AND followerId = ?", [targetUserId, followerId]);
      if (rows.length > 0) {
        await pool.query("DELETE FROM followers WHERE userId = ? AND followerId = ?", [targetUserId, followerId]);
        res.json({ message: "Unfollowed" });
      } else {
        await pool.query("INSERT INTO followers (userId, followerId) VALUES (?, ?)", [targetUserId, followerId]);
        res.json({ message: "Followed" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to follow/unfollow" });
    }
  });

  app.get("/api/users/match", authenticateToken, async (req, res) => {
    const { gender } = req.query;
    try {
      let query = "SELECT uid, name, photos, bio, city, country, gender FROM users WHERE uid != ?";
      let params = [req.user.uid];
      if (gender) {
        query += " AND gender = ?";
        params.push(gender);
      }
      query += " LIMIT 50";
      const [rows] = await pool.query(query, params);
      res.json(rows.map((u) => ({
        ...u,
        photos: JSON.parse(u.photos || '[]')
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to match users" });
    }
  });

  app.get("/api/messages/:chatId", authenticateToken, async (req, res) => {
    const { chatId } = req.params;
    const [u1, u2] = chatId.split('_');
    if (req.user.uid !== u1 && req.user.uid !== u2) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const [rows] = await pool.query(
        "SELECT * FROM messages WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?) ORDER BY createdAt ASC",
        [u1, u2, u2, u1]
      );
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", authenticateToken, async (req, res) => {
    const { receiverId, text } = req.body;
    try {
      const id = Date.now().toString();
      await pool.query(
        "INSERT INTO messages (id, senderId, receiverId, text) VALUES (?, ?, ?, ?)",
        [id, req.user.uid, receiverId, text]
      );
      res.json({ id, senderId: req.user.uid, receiverId, text });
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Reels
  app.post("/api/reels/:id/view", async (req, res) => {
    const reelId = req.params.id;
    try {
      await pool.query("UPDATE reels SET views = views + 1 WHERE id = ?", [reelId]);
      res.json({ message: "View recorded" });
    } catch (error) {
      res.status(500).json({ error: "Failed to record view" });
    }
  });

  app.get("/api/reels", async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT r.*, u.name as authorName, u.photoURL as authorPhoto 
        FROM reels r 
        JOIN users u ON r.userId = u.uid 
        ORDER BY r.createdAt DESC
      `);
      res.json(rows.map((r) => ({
        ...r,
        likes: JSON.parse(r.likes || '[]'),
        comments: JSON.parse(r.comments || '[]')
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reels" });
    }
  });

  app.post("/api/reels", authenticateToken, async (req, res) => {
    const { videoUrl, caption } = req.body;
    try {
      const id = Date.now().toString();
      await pool.query(
        "INSERT INTO reels (id, userId, videoUrl, caption, likes, comments) VALUES (?, ?, ?, ?, ?, ?)",
        [id, req.user.uid, videoUrl, caption, '[]', '[]']
      );
      res.json({ id, userId: req.user.uid, videoUrl, caption });
    } catch (error) {
      res.status(500).json({ error: "Failed to create reel" });
    }
  });

  app.post("/api/reels/:id/like", authenticateToken, async (req, res) => {
    const reelId = req.params.id;
    const userId = req.user.uid;
    try {
      const [rows] = await pool.query("SELECT likes FROM reels WHERE id = ?", [reelId]);
      if (rows.length === 0) return res.status(404).json({ error: "Reel not found" });
      
      let likes = JSON.parse(rows[0].likes || '[]');
      if (likes.includes(userId)) {
        likes = likes.filter((id) => id !== userId);
      } else {
        likes.push(userId);
      }
      
      await pool.query("UPDATE reels SET likes = ? WHERE id = ?", [JSON.stringify(likes), reelId]);
      res.json({ likes });
    } catch (error) {
      res.status(500).json({ error: "Failed to like reel" });
    }
  });

  app.post("/api/reels/:id/view", async (req, res) => {
    const reelId = req.params.id;
    try {
      await pool.query("UPDATE reels SET views = views + 1 WHERE id = ?", [reelId]);
      res.json({ message: "View counted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to count view" });
    }
  });

  app.post("/api/users/:uid/swipe", authenticateToken, async (req, res) => {
    const targetUid = req.params.uid;
    const { direction } = req.body;
    const myUid = req.user.uid;

    try {
      const [rows] = await pool.query("SELECT likes, dislikes, matches FROM users WHERE uid = ?", [myUid]);
      if (rows.length === 0) return res.status(404).json({ error: "User not found" });

      let likes = rows[0].likes || [];
      let dislikes = rows[0].dislikes || [];
      let matches = rows[0].matches || [];

      if (direction === 'right') {
        if (!likes.includes(targetUid)) likes.push(targetUid);
        
        // Check for match
        const [targetRows] = await pool.query("SELECT likes, matches FROM users WHERE uid = ?", [targetUid]);
        if (targetRows.length > 0) {
          let targetLikes = targetRows[0].likes || [];
          let targetMatches = targetRows[0].matches || [];
          
          if (targetLikes.includes(myUid)) {
            // It's a match!
            if (!matches.includes(targetUid)) matches.push(targetUid);
            if (!targetMatches.includes(myUid)) targetMatches.push(myUid);
            
            await pool.query("UPDATE users SET matches = ? WHERE uid = ?", [JSON.stringify(targetMatches), targetUid]);
            await pool.query("UPDATE users SET likes = ?, matches = ? WHERE uid = ?", [JSON.stringify(likes), JSON.stringify(matches), myUid]);
            
            // Create notification for target user
            await pool.query(
              "INSERT INTO notifications (receiverId, senderId, type, read) VALUES (?, ?, ?, ?)",
              [targetUid, myUid, 'match', false]
            );
            
            return res.json({ isMatch: true });
          }
        }
        await pool.query("UPDATE users SET likes = ? WHERE uid = ?", [JSON.stringify(likes), myUid]);
      } else {
        if (!dislikes.includes(targetUid)) dislikes.push(targetUid);
        await pool.query("UPDATE users SET dislikes = ? WHERE uid = ?", [JSON.stringify(dislikes), myUid]);
      }

      res.json({ isMatch: false });
    } catch (error) {
      res.status(500).json({ error: "Failed to process swipe" });
    }
  });

  // Wallet & Adverts
  app.get("/api/transactions", authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC", [req.user.uid]);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/settings/site", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM settings WHERE id = 'site'");
      res.json(rows[0] || { pointValue: 0.01 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/wallet/convert-points", authenticateToken, async (req, res) => {
    const userId = req.user.uid;
    try {
      const [userRows] = await pool.query("SELECT points, walletBalance FROM users WHERE uid = ?", [userId]);
      if (userRows.length === 0) return res.status(404).json({ error: "User not found" });
      
      const [settingsRows] = await pool.query("SELECT pointValue FROM settings WHERE id = 'site'");
      const pointValue = settingsRows[0]?.pointValue || 0.01;
      
      const points = userRows[0].points;
      const conversionValue = points * pointValue;
      
      if (points <= 0) return res.status(400).json({ error: "No points to convert" });
      
      await pool.query("UPDATE users SET points = 0, walletBalance = walletBalance + ? WHERE uid = ?", [conversionValue, userId]);
      
      const txId = Date.now().toString();
      await pool.query(
        "INSERT INTO transactions (id, userId, amount, type, description) VALUES (?, ?, ?, ?, ?)",
        [txId, userId, conversionValue, 'points_conversion', 'Points to Wallet']
      );
      
      res.json({ message: "Points converted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to convert points" });
    }
  });

  app.post("/api/adverts", authenticateToken, async (req, res) => {
    const { title, link, type, budget } = req.body;
    const userId = req.user.uid;
    try {
      const [userRows] = await pool.query("SELECT walletBalance, level FROM users WHERE uid = ?", [userId]);
      if (userRows.length === 0) return res.status(404).json({ error: "User not found" });
      
      if (userRows[0].walletBalance < budget) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      
      const adId = Date.now().toString();
      await pool.query(
        "INSERT INTO adverts (id, sponsorId, title, link, type, budget) VALUES (?, ?, ?, ?, ?, ?)",
        [adId, userId, title, link, type, budget]
      );
      
      await pool.query("UPDATE users SET walletBalance = walletBalance - ? WHERE uid = ?", [budget, userId]);
      
      const txId = (Date.now() + 1).toString();
      await pool.query(
        "INSERT INTO transactions (id, userId, amount, type, description) VALUES (?, ?, ?, ?, ?)",
        [txId, userId, -budget, 'payment', `Ad Sponsorship: ${title}`]
      );
      
      // Upgrade level
      const levels = ['Bronze', 'Gold', 'Platinum'];
      const currentIdx = levels.indexOf(userRows[0].level || 'Bronze');
      const nextLevel = levels[Math.min(currentIdx + 1, levels.length - 1)];
      await pool.query("UPDATE users SET level = ? WHERE uid = ?", [nextLevel, userId]);
      
      res.json({ id: adId });
    } catch (error) {
      res.status(500).json({ error: "Failed to create ad" });
    }
  });

  app.post("/api/wallet/accumulate-points", authenticateToken, async (req, res) => {
    const { type } = req.body;
    const userId = req.user.uid;
    const pointsMap = { POST: 10, COMMENT: 5, REEL: 15, LIKE: 1 };
    const points = pointsMap[type] || 0;
    
    try {
      await pool.query("UPDATE users SET points = points + ? WHERE uid = ?", [points, userId]);
      res.json({ message: "Points accumulated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to accumulate points" });
    }
  });

  app.post("/api/transactions", authenticateToken, async (req, res) => {
    const { amount, type, description, status } = req.body;
    const userId = req.user.uid;
    const id = Date.now().toString();
    
    try {
      await pool.query(
        "INSERT INTO transactions (id, userId, amount, type, description, status) VALUES (?, ?, ?, ?, ?, ?)",
        [id, userId, amount, type, description, status || 'completed']
      );
      
      if (status === 'completed') {
        await pool.query("UPDATE users SET walletBalance = walletBalance + ? WHERE uid = ?", [amount, userId]);
      }
      
      res.json({ id });
    } catch (error) {
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.get("/api/chats", authenticateToken, async (req, res) => {
    const userId = req.user.uid;
    try {
      const [userRows] = await pool.query("SELECT matches FROM users WHERE uid = ?", [userId]);
      const matches = userRows[0]?.matches || [];
      
      const chatList = await Promise.all(matches.map(async (matchId) => {
        const [otherUserRows] = await pool.query("SELECT * FROM users WHERE uid = ?", [matchId]);
        const otherUser = otherUserRows[0];
        const id = [userId, matchId].sort().join('_');
        return { id, otherUser };
      }));
      
      res.json(chatList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  });

  app.get("/api/pages", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM pages ORDER BY createdAt DESC");
      res.json(rows.map((p) => ({
        ...p,
        followers: JSON.parse(p.followers || '[]'),
        likes: JSON.parse(p.likes || '[]')
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  app.post("/api/pages", authenticateToken, async (req, res) => {
    const { title, description, category } = req.body;
    const ownerId = req.user.uid;
    const id = Date.now().toString();
    
    try {
      await pool.query(
        "INSERT INTO pages (id, ownerId, title, description, category, followers, likes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, ownerId, title, description, category, '[]', '[]']
      );
      const [rows] = await pool.query("SELECT * FROM pages WHERE id = ?", [id]);
      res.json({
        ...rows[0],
        followers: [],
        likes: []
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create page" });
    }
  });

  app.get("/api/pages/:id", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM pages WHERE id = ?", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "Page not found" });
      res.json({
        ...rows[0],
        followers: JSON.parse(rows[0].followers || '[]'),
        likes: JSON.parse(rows[0].likes || '[]')
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch page" });
    }
  });

  app.post("/api/pages/:id/follow", authenticateToken, async (req, res) => {
    const userId = req.user.uid;
    const pageId = req.params.id;
    try {
      const [pageRows] = await pool.query("SELECT * FROM pages WHERE id = ?", [pageId]);
      if (pageRows.length === 0) return res.status(404).json({ error: "Page not found" });
      
      let followers = JSON.parse(pageRows[0].followers || '[]');
      const isFollowing = followers.includes(userId);
      
      if (isFollowing) {
        followers = followers.filter((id) => id !== userId);
      } else {
        followers.push(userId);
      }
      
      await pool.query("UPDATE pages SET followers = ? WHERE id = ?", [JSON.stringify(followers), pageId]);
      
      // Notify owner if following
      if (!isFollowing && pageRows[0].ownerId !== userId) {
        const notificationId = Date.now().toString();
        await pool.query(
          "INSERT INTO notifications (id, receiverId, senderId, type, text) VALUES (?, ?, ?, ?, ?)",
          [notificationId, pageRows[0].ownerId, userId, 'page_follow', `Someone followed your page ${pageRows[0].title}`]
        );
      }
      
      const [updatedPage] = await pool.query("SELECT * FROM pages WHERE id = ?", [pageId]);
      res.json({
        ...updatedPage[0],
        followers,
        likes: JSON.parse(updatedPage[0].likes || '[]')
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to follow page" });
    }
  });

  app.post("/api/pages/:id/like", authenticateToken, async (req, res) => {
    const userId = req.user.uid;
    const pageId = req.params.id;
    try {
      const [pageRows] = await pool.query("SELECT * FROM pages WHERE id = ?", [pageId]);
      if (pageRows.length === 0) return res.status(404).json({ error: "Page not found" });
      
      let likes = JSON.parse(pageRows[0].likes || '[]');
      const isLiked = likes.includes(userId);
      
      if (isLiked) {
        likes = likes.filter((id) => id !== userId);
      } else {
        likes.push(userId);
      }
      
      await pool.query("UPDATE pages SET likes = ? WHERE id = ?", [JSON.stringify(likes), pageId]);
      
      // Notify owner if liked
      if (!isLiked && pageRows[0].ownerId !== userId) {
        const notificationId = Date.now().toString();
        await pool.query(
          "INSERT INTO notifications (id, receiverId, senderId, type, text) VALUES (?, ?, ?, ?, ?)",
          [notificationId, pageRows[0].ownerId, userId, 'like', `Someone liked your page ${pageRows[0].title}`]
        );
      }
      
      const [updatedPage] = await pool.query("SELECT * FROM pages WHERE id = ?", [pageId]);
      res.json({
        ...updatedPage[0],
        followers: JSON.parse(updatedPage[0].followers || '[]'),
        likes
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to like page" });
    }
  });

  app.get("/api/groups", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM groups ORDER BY createdAt DESC");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  app.post("/api/groups", authenticateToken, async (req, res) => {
    const { title, description, privacy } = req.body;
    const ownerId = req.user.uid;
    const id = Date.now().toString();
    const members = JSON.stringify([ownerId]);
    
    try {
      await pool.query(
        "INSERT INTO groups (id, ownerId, title, description, privacy, members) VALUES (?, ?, ?, ?, ?, ?)",
        [id, ownerId, title, description, privacy, members]
      );
      const [rows] = await pool.query("SELECT * FROM groups WHERE id = ?", [id]);
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM groups WHERE id = ?", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "Group not found" });
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group" });
    }
  });

  app.post("/api/groups/:id/join", authenticateToken, async (req, res) => {
    const userId = req.user.uid;
    const groupId = req.params.id;
    try {
      const [groupRows] = await pool.query("SELECT * FROM groups WHERE id = ?", [groupId]);
      if (groupRows.length === 0) return res.status(404).json({ error: "Group not found" });
      
      let members = groupRows[0].members || [];
      const isMember = members.includes(userId);
      
      if (isMember) {
        members = members.filter((id) => id !== userId);
      } else {
        members.push(userId);
      }
      
      await pool.query("UPDATE groups SET members = ? WHERE id = ?", [JSON.stringify(members), groupId]);
      
      // Notify owner if joining
      if (!isMember && groupRows[0].ownerId !== userId) {
        const notificationId = Date.now().toString();
        await pool.query(
          "INSERT INTO notifications (id, receiverId, senderId, type, text) VALUES (?, ?, ?, ?, ?)",
          [notificationId, groupRows[0].ownerId, userId, 'group_join', `Someone joined your group ${groupRows[0].title}`]
        );
      }
      
      const [updatedGroup] = await pool.query("SELECT * FROM groups WHERE id = ?", [groupId]);
      res.json(updatedGroup[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM products ORDER BY createdAt DESC");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/products", authenticateToken, async (req, res) => {
    const { title, description, price, image, category } = req.body;
    const userId = req.user.uid;
    const authorName = req.user.name;
    const id = Date.now().toString();
    
    try {
      await pool.query(
        "INSERT INTO products (id, userId, authorName, title, description, price, image, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, userId, authorName, title, description, price, image, category]
      );
      const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.delete("/api/products/:id", authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT userId FROM products WHERE id = ?", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "Product not found" });
      
      if (rows[0].userId !== req.user.uid && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
      res.json({ message: "Product deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.post("/api/products/:id/save", authenticateToken, async (req, res) => {
    const userId = req.user.uid;
    const productId = req.params.id;
    try {
      const [userRows] = await pool.query("SELECT savedProducts FROM users WHERE uid = ?", [userId]);
      let savedProducts = userRows[0]?.savedProducts || [];
      
      if (savedProducts.includes(productId)) {
        savedProducts = savedProducts.filter((id) => id !== productId);
      } else {
        savedProducts.push(productId);
      }
      
      await pool.query("UPDATE users SET savedProducts = ? WHERE uid = ?", [JSON.stringify(savedProducts), userId]);
      res.json({ message: "Product save status updated", savedProducts });
    } catch (error) {
      res.status(500).json({ error: "Failed to save product" });
    }
  });

  const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: "Admin access required" });
    }
  };

  app.post("/api/admin/settings", authenticateToken, isAdmin, async (req, res) => {
    const { pointValue, announcement, adHtml } = req.body;
    try {
      await pool.query(
        "UPDATE settings SET pointValue = ?, announcement = ?, adHtml = ? WHERE id = 'site'",
        [pointValue, announcement, adHtml]
      );
      res.json({ message: "Settings updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.get("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM users LIMIT 50");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/posts", authenticateToken, isAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM posts ORDER BY createdAt DESC LIMIT 50");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/admin/reports", authenticateToken, isAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM reports ORDER BY createdAt DESC LIMIT 50");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.get("/api/admin/adverts", authenticateToken, isAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM adverts ORDER BY createdAt DESC LIMIT 50");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch adverts" });
    }
  });

  app.post("/api/admin/users/:uid/promote", authenticateToken, isAdmin, async (req, res) => {
    try {
      await pool.query("UPDATE users SET role = 'admin' WHERE uid = ?", [req.params.uid]);
      res.json({ message: "User promoted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to promote user" });
    }
  });

  app.delete("/api/admin/posts/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      await pool.query("DELETE FROM posts WHERE id = ?", [req.params.id]);
      res.json({ message: "Post deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  app.post("/api/admin/users/:uid/verify", authenticateToken, isAdmin, async (req, res) => {
    const { approve } = req.body;
    try {
      await pool.query(
        "UPDATE users SET isVerified = ?, isVerifiedPending = 0 WHERE uid = ?",
        [approve ? 1 : 0, req.params.uid]
      );
      res.json({ message: "Verification processed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify user" });
    }
  });

  app.post("/api/admin/users/:uid/ban", authenticateToken, isAdmin, async (req, res) => {
    const { ban } = req.body;
    try {
      await pool.query("UPDATE users SET isBanned = ? WHERE uid = ?", [ban ? 1 : 0, req.params.uid]);
      res.json({ message: "Ban status updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update ban status" });
    }
  });

  app.post("/api/admin/users/:uid/suspend", authenticateToken, isAdmin, async (req, res) => {
    const { duration, until } = req.body;
    try {
      await pool.query(
        "UPDATE users SET isSuspended = ?, suspensionUntil = ? WHERE uid = ?",
        [duration > 0 ? 1 : 0, until, req.params.uid]
      );
      res.json({ message: "Suspension status updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update suspension status" });
    }
  });

  app.post("/api/admin/reports/:id/resolve", authenticateToken, isAdmin, async (req, res) => {
    try {
      await pool.query("UPDATE reports SET status = 'resolved' WHERE id = ?", [req.params.id]);
      res.json({ message: "Report resolved" });
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve report" });
    }
  });

  app.post("/api/admin/adverts/:id/approve", authenticateToken, isAdmin, async (req, res) => {
    const { approve } = req.body;
    try {
      await pool.query(
        "UPDATE adverts SET status = ? WHERE id = ?",
        [approve ? 'active' : 'rejected', req.params.id]
      );
      res.json({ message: "Advert status updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update advert status" });
    }
  });

  app.post("/api/admin/users/:uid/fund", authenticateToken, isAdmin, async (req, res) => {
    const { amount } = req.body;
    const id = Date.now().toString();
    try {
      await pool.query("UPDATE users SET walletBalance = walletBalance + ? WHERE uid = ?", [amount, req.params.uid]);
      await pool.query(
        "INSERT INTO transactions (id, userId, amount, type, description, status) VALUES (?, ?, ?, ?, ?, ?)",
        [id, req.params.uid, amount, 'deposit', 'Admin Funding', 'completed']
      );
      res.json({ message: "User funded" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fund user" });
    }
  });

  // --- PAYPAL ROUTES ---
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
          purchase_units: [{ amount: { currency_code: 'USD', value: amount } }],
        }),
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create PayPal order' });
    }
  });

  app.post("/api/paypal/capture-order", authenticateToken, async (req, res) => {
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
      
      if (data.status === 'COMPLETED') {
        const amount = data.purchase_units[0].payments.captures[0].amount.value;
        const userId = req.user.uid;
        
        await pool.query("UPDATE users SET walletBalance = walletBalance + ? WHERE uid = ?", [amount, userId]);
        
        const txId = Date.now().toString();
        await pool.query(
          "INSERT INTO transactions (id, userId, amount, type, description) VALUES (?, ?, ?, ?, ?)",
          [txId, userId, amount, 'deposit', 'PayPal']
        );
      }
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to capture PayPal order' });
    }
  });

  // Vite middleware
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
