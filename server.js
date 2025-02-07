const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { MongoClient } = require("mongodb");

// MongoDB connection URI
const mongoURI = "mongodb+srv://vgugan16:gugan2004@cluster0.qyh1fuo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "user_db";
let db;

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((client) => {
    db = client.db(dbName);
    console.log("Connected to MongoDB");
  })
  .catch((err) => console.error("Failed to connect to MongoDB", err));

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  try {
    const userExists = await db.collection("users").findOne({ username });

    if (userExists) {
      res.status(400).json({ message: "Username already exists" });
    } else {
      await db.collection("users").insertOne({ username, password });
      res.status(201).json({ message: "Signup successful!" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Extract token from header
  
    if (!token) return res.status(401).json({ message: "Unauthorized" });
  
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) return res.status(403).json({ message: "Forbidden" });
      req.user = user; // Attach user info to request object
      next();
    });
  }
  
// Login Route
const jwt = require("jsonwebtoken");
const SECRET_KEY = "your_secret_key";
const TOKEN_EXPIRATION = "1h"; // Token validity duration

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if user exists in the database
    const user = await db.collection("users").findOne({ username, password });

    if (user) {
      // Generate JWT token with user details
      const token = jwt.sign(
        { username: user.username }, // Payload
        SECRET_KEY, // Secret key
        { expiresIn: TOKEN_EXPIRATION } // Token expiry
      );

      // Respond with token
      res.status(200).json({
        message: "Login successful!",
        token, // Send token to client
      });
    } else {
      res.status(400).json({ message: "Invalid username or password" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/profile", authenticateToken, async (req, res) => {
    try {
      const user = await db.collection("users").findOne({ username: req.user.username });
  
      if (user) {
        res.json({
          username: user.username,
          email: user.email || "Not provided",
          fullName: user.fullName || "Not provided",
          joinedOn: user.joinedOn,
        });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
