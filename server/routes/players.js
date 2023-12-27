const express = require("express");
const router = express.Router();
const Player = require("/workspaces/NFl-Webpage/server/classes/Player.js");
const Team = require("/workspaces/NFl-Webpage/server/classes/Team.js");
const Game = require("/workspaces/NFl-Webpage/server/classes/Game.js");
const DatabaseHandler = require("/workspaces/NFl-Webpage/server/classes/DatabaseHandler.js");

const databaseHandler = new DatabaseHandler();

router.route("/").get(async (req, res) => {
  try {
    const players = await databaseHandler.getAllPlayers();
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/update").put(async (req, res) => {
  try {
    databaseHandler.updatePlayers();
    res.json("players updated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
