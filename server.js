const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// MongoDB Connection URI
const mongoURI = "mongodb+srv://vgugan16:gugan2004@cluster0.qyh1fuo.mongodb.net/user_db?retryWrites=true&w=majority&appName=Cluster0";
const SECRET_KEY = "your_secret_key";
const TOKEN_EXPIRATION = "1h"; // Token expiry

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,  // Timeout after 5 seconds instead of 30
    socketTimeoutMS: 45000  // Close sockets after 45 seconds of inactivity
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Failed to connect to MongoDB:", err));
  

    
    
    // Define the Service schema that includes store details
    
    
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      latitude: { type: Number, required: true }, // Add latitude
      longitude: { type: Number, required: true } // Add longitude
    });
    
    const User = mongoose.model("User", userSchema);
    
    
// Define Service Schema
// Fetch Store Details API
const storeSchema = new mongoose.Schema(
    {
      storeName: String,
      contactNumber: String,
      email: String,
      password: String,
      location: {
        latitude: mongoose.Schema.Types.Decimal128, // Latitude as Decimal128
        longitude: mongoose.Schema.Types.Decimal128, // Longitude as Decimal128
      },
    },
    { collection: "store" } // Ensure the collection is named "store"
  );
  
  const Store = mongoose.model("Store", storeSchema);
  const bookings = []; // In-memory bookings array for simplicity
  const bookingSchema = new mongoose.Schema(
    {
      username: String, 
      storeEmail: String,
      status: String,
      date: Date,
    },
    { collection: "bookings" } // Ensure the collection is named "bookings"
  );
  
  const Booking = mongoose.model("Booking", bookingSchema);
  function authenticateToken(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) {
      console.log('No token provided');  // Log missing token
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.log('Invalid token');  // Log invalid token
        return res.status(403).json({ message: 'Forbidden: Invalid token' });
      }
      console.log(`User authenticated: ${user.username}`);  // Log successful token decoding
      req.user = user;
      next();
    });
  }
  
  app.post('/bookings', authenticateToken, async (req, res) => {
    console.log("POST /bookings route hit");
    // Existing logic...
     const { storeEmail } = req.body;
    console.log("came in");
    if (!storeEmail) {
      console.log('Error: Store email is required');
      return res.status(400).json({ message: 'Store email is required' });
    }
  
    try {
      const username = req.user?.username;
  
      if (!username) {
        console.log('Error: Unauthorized access - Username missing from token');
        return res.status(401).json({ message: 'Unauthorized: Username missing from token' });
      }
  
      const store = await Store.findOne({ email: storeEmail });
      if (!store) {
        console.log(`Error: Store not found for email ${storeEmail}`);
        return res.status(404).json({ message: 'Store not found' });
      }
  
      const existingBooking = await Booking.findOne({ username, storeEmail });
      if (existingBooking) {
        console.log(`Error: Duplicate booking attempt for user ${username} and store ${storeEmail}`);
        return res.status(409).json({ message: 'Booking already exists for this store and user' });
      }
  
      const newBooking = new Booking({
        username,
        storeEmail,
        status: 'pending',
        date: new Date(),
      });
  
      await newBooking.save();
      console.log(`Booking created successfully for user ${username} and store ${storeEmail}`);
      res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
    } catch (error) {
      console.log('Error processing booking:', error);  // This line prints detailed error info
      res.status(500).json({ message: 'Failed to create booking due to an internal server error' });
    }
  });
  
  app.get("/api/stores", async (req, res) => {
    try {
      const stores = await Store.find({});
      
      // Format location data to send readable latitude and longitude
      const formattedStores = stores.map((store) => ({
        ...store.toObject(),
        location: {
          latitude: store.location.latitude.toString(),
          longitude: store.location.longitude.toString(),
        },
      }));
  
      res.status(200).json(formattedStores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).send("Error fetching stores.");
    }
  });
  
  
// Signup Route
app.post("/signup", async (req, res) => {
  const { username, password, latitude, longitude } = req.body;

  try {
    // Check if the user already exists
    const userExists = await User.findOne({ username });
    if (userExists) return res.status(400).json({ message: "Username already exists" });

    // Create a new user with latitude and longitude
    const newUser = new User({ username, password, latitude, longitude });
    await newUser.save();

    console.log("New user saved:", newUser);
    res.status(201).json({ message: "Signup successful!" });
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get('/api/user/bookings', authenticateToken, async (req, res) => {
  try {
    const username = req.user?.username; // Get username from the authenticated token
    console.log("Fetching bookings for username:", username);

    if (!username) {
      console.log("Error: Username missing from token");
      return res.status(401).json({ message: 'Unauthorized: Username missing from token' });
    }

    // Fetch all bookings for the user
    const userBookings = await Booking.find({ username });
    console.log("Fetched bookings:", userBookings);

    if (userBookings.length === 0) {
      console.log("No bookings found for user:", username);
    }

    res.status(200).json(userBookings);
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

app.delete('/api/user/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const username = req.user?.username; // Extract username from authenticated token

    if (!username) {
      return res.status(401).json({ message: 'Unauthorized: Username missing from token' });
    }

    // Find the booking to ensure it belongs to the user
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.username !== username) {
      return res.status(403).json({ message: 'Unauthorized: You can only delete your own bookings' });
    }

    // Only allow deletion if the booking is "pending" or "rejected"
    if (booking.status !== 'pending' && booking.status !== 'rejected') {
      return res.status(400).json({ message: 'Only pending or rejected bookings can be deleted' });
    }

    // Delete the booking
    await Booking.findByIdAndDelete(bookingId);

    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Failed to delete booking' });
  }
});

// Login Route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (!user) return res.status(400).json({ message: "Invalid username or password" });

        const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: TOKEN_EXPIRATION });
        console.log(token);
        res.status(200).json({ message: "Login successful!", token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Middleware for Token Authentication
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Forbidden" });
        req.user = user;
        next();
    });
}


app.get("/profile", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // Find user in the database
    const user = await User.findOne({ username: decoded.username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send user data, including latitude and longitude
    res.status(200).json({ 
      message: "Profile fetched successfully", 
      user: { 
        username: user.username, 
        email: user.email || "", // Ensure email is not undefined
        latitude: user.latitude || "", 
        longitude: user.longitude || ""
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// API to Fetch All Services
const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    store: {
        storeName: { type: String, required: true },
        address: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    }
});

const Service = mongoose.model("Service", serviceSchema);

// API to Fetch All Services
app.get("/api/services", async (req, res) => {
    try {
        const services = await Service.find();
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: "Error fetching services" });
    }
});

// API to Insert a New Service with Store Details
app.post("/api/services", async (req, res) => {
    try {
        const { name, description, store } = req.body;

        if (!name || !description || !store?.storeName || !store?.address || store?.latitude === undefined || store?.longitude === undefined) {
            return res.status(400).json({ message: "All fields including store details are required" });
        }

        const newService = new Service({ name, description, store });
        await newService.save();

        res.status(201).json({ message: "Service added successfully", service: newService });
    } catch (error) {
        console.error("Error adding service:", error);
        res.status(500).json({ message: "Error adding service", error: error.message });
    }
});

// API to Delete a Service
app.delete("/api/services/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Service.findByIdAndDelete(id);
        if (result) {
            res.status(200).json({ message: "Service deleted successfully" });
        } else {
            res.status(404).json({ message: "Service not found" });
        }
    } catch (error) {
        console.error("Error deleting service:", error);
        res.status(500).json({ message: "Error deleting service", error: error.message });
    }
});
// Start the server
app.get('/api/users/:id', async (req, res) => {
try {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
} catch (err) {
  res.status(500).json({ error: err.message });
}
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
