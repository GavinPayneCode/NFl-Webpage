const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const playerRouter = require("./routes/players");
const gameRouter = require("./routes/games");
const teamRouter = require("./routes/teams");
const MongoClient = require("mongodb").MongoClient;

//setting variables for the server
const app = express();
const port = 8000;
app.use(cors());
app.use(express.json());

//mongoDB uri needed to connect to the database
const uri =
  "mongodb+srv://g2payne11:stop@cluster0.egw2sc9.mongodb.net/NFL_Data?retryWrites=true&w=majority";

async function connectToDatabase() {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    });
    console.log("Connected to database");

    //starting the server
    app.listen(port, () => {
      console.log("Server is running on port:" + port);
    });
  } catch (err) {
    console.error(err);
  }
}

//setting up the routes for the server
app.use("/players", playerRouter);
app.use("/games", gameRouter);
app.use("/teams", teamRouter);

connectToDatabase();
