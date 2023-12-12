const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");

//base url needed to get the data
const url =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes?limit=1000&";

//function to get the data from the api
async function getNFLLeagueData(url, page) {
  if (page === undefined) page = 1;
  const response = await axios.get(url + "page=" + page);
  const jsonData = await response.data;
  return jsonData;
}

//function that loops through the json looking for api's in the properties of $ref
//then runs the api and replaces the $ref with the data from the api
async function resolve_ref(ref_data) {
  for (const i in ref_data) {
    if (i === "$ref") {
      const response = await axios.get(ref_data["$ref"]);
      ref_data["playerObject"] = await response.data;
      delete ref_data["$ref"];
      console.log(ref_data["playerObject"]["fullName"]);
    } else if (typeof ref_data[i] === "object") {
      await resolve_ref(ref_data[i]);
    }
  }
  return ref_data;
}

//function that loops through all the pages of the api and returns the data
async function allPlayers(url, pages) {
  let requests = [];
  for (let i = 1; i <= pages; i++) {
    const data = await getNFLLeagueData(url, i);
    requests.push(resolve_ref(data.items));
  }
  let combinedJsonData = await Promise.all(requests);
  combinedJsonData = [].concat(...combinedJsonData);
  return combinedJsonData;
}
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
        .limit(500)
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

//route for updating the players in the database
//will rerun the api call and check to see if the player is already in the database
//if a player is already in the dataabse there information will be updated
//if a player is not in the database they will be added to the database
//this is usefull to run at the start of each new season
router.route("/update").get(async (req, res) => {
  try {
    //there is 720 pages of 25 players each with there own api
    const updatedPlayers = await allPlayers(url, 18);

    //this is a bulk write operation that will update the players in the database
    const bulkOps = updatedPlayers.map((player) => ({
      updateOne: {
        filter: { "playerObject.id": player["playerObject"]["id"] },
        update: { $set: { playerObject: player["playerObject"] } },
        upsert: true,
      },
    }));
    await players.bulkWrite(bulkOps);

    res.json("players have been updated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

//route for deleting all the players in the database
router.route("/deleteAll").get(async (req, res) => {
  try {
    players.deleteMany({});
    res.json({ message: "All players deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
