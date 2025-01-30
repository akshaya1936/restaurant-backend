const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const mongourl = "mongodb+srv://akshaya1:akshaya@cluster0.hn97fvw.mongodb.net/";

// Middleware for CORS
app.use(cors({
    origin: "http://localhost:5173",  
    methods: "GET,POST,PUT,DELETE",   
    credentials: true                 
}));

app.use(express.json());

// Connect to MongoDB
mongoose.connect(mongourl)
    .then(() => {
        console.log("Database Connected successfully");
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);

        });
    })
    .catch((err) => console.log("Error connecting to MongoDB:", err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const UserModel = mongoose.model('User', userSchema);

// Restaurant Schema
const restaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    cuisine: { type: String, required: true },
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// Reservation Schema
const reservationSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    guests: { type: Number, required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }, // reference to Restaurant
});

const Reservation = mongoose.model('Reservation', reservationSchema);

// Authorization Middleware
const authorize = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(403).json({ message: "No token provided" });

    jwt.verify(token, "my-key", (err, user) => {
        if (err) return res.status(401).json({ message: "Unauthorized" });
        req.user = user;
        next();
    });
};


// User Registration
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new UserModel({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: "Failed to register user" });
    }
});

// User Login
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await UserModel.findOne({ username });
        if (!user) return res.status(400).json({ message: "Invalid Username" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect Password" });

        const token = jwt.sign({ username: user.username }, "my-key", { expiresIn: "1h" });
        res.json({ message: "Login successful", token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Add Restaurant
app.post("/api/restaurants", authorize, async (req, res) => {
    const { name, location, cuisine } = req.body;

    const newRestaurant = new Restaurant({ name, location, cuisine });

    try {
        const savedRestaurant = await newRestaurant.save();
        res.status(201).json(savedRestaurant);
    } catch (error) {
        console.error("Error creating restaurant:", error);
        res.status(500).json({ message: "Failed to create restaurant" });
    }
});

// Get All Restaurants
app.get("/api/restaurants", async (req, res) => {
    try {
        const restaurants = await Restaurant.find();
        res.status(200).json(restaurants);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch restaurants" });
    }
});

// Get Reservations
app.get("/api/reservations", authorize, async (req, res) => {
    try {
        const reservations = await Reservation.find().populate("restaurantId"); // Populate restaurant details
        res.status(200).json(reservations);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch reservations" });
    }
});

// Create Reservation
app.post("/api/reservations", authorize, async (req, res) => {
    const { name, email, phone, date, time, guests, restaurantId } = req.body;

    const newReservation = new Reservation({
        id: uuidv4(),
        name, email, phone, date, time, guests, restaurantId,
    });

    try {
        const savedReservation = await newReservation.save();
        res.status(201).json(savedReservation);
    } catch (error) {
        console.error("Error creating reservation:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Delete Reservation
app.delete("/api/reservations/:id", authorize, async (req, res) => {
    const { id } = req.params;

    try {
        const deletedReservation = await Reservation.findOneAndDelete({ id });
        if (!deletedReservation) return res.status(404).json({ message: "Reservation not found" });

        res.status(200).json(deletedReservation);
    } catch (error) {
        res.status(500).json({ message: "Error deleting reservation" });
    }
});

