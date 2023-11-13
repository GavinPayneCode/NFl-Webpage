const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");

//base url needed to get the data
const url =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes?";

//base route for the database connection to get pass through
//then connects to the players collection
router.use((req, res, next) => {
  players = req.db.collection("players");
  next();
});

//route for getting the players from the database with the filter and sort parameters
router.route("/").get(async (req, res) => {
  try {
    res.json(
      await players
        .find(req.query.filter)
        .sort(req.query.sort)
        .limit(2000)
        .toArray()
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

//route for getting the stats of a player with a players id
router.route("/stats/:id").get(async (req, res) => {
  try {
    const playerStatsApi = await getNFLLeagueData(
      "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/" +
        req.params.id +
        "/statistics?"
    );
    //there is multiple categories of stats so this loops through all of them and adds them to an array
    //then only returns the stats that are not 0
    const playerStats = [];
    playerStatsApi.splits.categories.map((category) => {
      category.stats.map((stat) => {
        if (stat.value !== 0) playerStats.push(stat);
      });
    });

    res.json(playerStats);
  } catch (err) {
    res.json({ message: "No stats for this player" });
  }
});

router.route("/update").get(async (req, res) => {
  allPlayerData = [];
  for (let i = 1; i <= 2; i++) {
    playerData = await axios.get(
      "https://sports.core.api.espn.com/v3/sports/football/college-football/athletes?limit=1000&page=" +
        i
    );
    allPlayerData = allPlayerData.concat(playerData.data.items);
  }
  players.deleteMany({});
  players.insertMany(allPlayerData);

  res.json("players have been updated with new method");
});

module.exports = router;
