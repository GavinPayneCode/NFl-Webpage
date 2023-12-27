const express = require("express");
const router = express.Router();
const Player = require("/workspaces/NFl-Webpage/server/classes/Player.js");
const Team = require("/workspaces/NFl-Webpage/server/classes/Team.js");
const Game = require("/workspaces/NFl-Webpage/server/classes/Game.js");
const DatabaseHandler = require("/workspaces/NFl-Webpage/server/classes/DatabaseHandler.js");

const databaseHandler = new DatabaseHandler();

router.route("/").get(async (req, res) => {
  try {
    const games = await databaseHandler.getAllGames();
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/add").post(async (req, res) => {
  try {
    const newGame = new Game(req.query.game);
    const game = await databaseHandler.addGame(newGame);
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/update").put(async (req, res) => {
  try {
    const newGame = new Game(req.query.game);
    const game = await databaseHandler.updateGame(newGame);
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
