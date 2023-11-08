const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
const playerRouter = require("./routes/players");
const gameRouter = require("./routes/games");
const teamRouter = require("./routes/teams");
//testing
//setting variables for the server
const app = express();
const port = 8000;
app.use(cors());
app.use(express.json());

//mongoDB uri needed to connect to the database
const uri =
  "mongodb+srv://g2payne11:stop@cluster0.egw2sc9.mongodb.net/?retryWrites=true&w=majority";

async function connectToDatabase() {
  try {
    const client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to databasess");

    //connecting to the NCAAF_Data database
    const db = client.db("NCAAF_Data");

    //returning the connection to the database
    return db;
  } catch (err) {
    console.error(err);
  }
}

async function startServer() {
  try {
    const db = await connectToDatabase();

    //setting up the routes for the server
    app.use("/players", (req, res, next) => {
      req.db = db;
      next();
    });
    app.use("/games", (req, res, next) => {
      req.db = db;
      next();
    });
    app.use("/teams", (req, res, next) => {
      req.db = db;
      next();
    });
    app.use("/players", playerRouter);
    app.use("/games", gameRouter);
    app.use("/teams", teamRouter);

    //starting the server
    app.listen(port, () => {
      console.log("Server is running on port:" + port);
    });
  } catch (err) {
    console.error(err);
  }
}

startServer();
