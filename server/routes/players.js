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
  let jsonData;
  while (!jsonData) {
    try {
      const response = await axios.get(url + "page=" + page);
      jsonData = await response.data;
    } catch (err) {
      console.log("To many requests, waiting 6 seconds");
      await delay(6000);
    }
  }
  return jsonData;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getStats(url) {
  const playerStatsApi = await getNFLLeagueData(url);
  const playerStats = [];
  playerStatsApi.splits.categories.map((category) => {
    category.stats.map((stat) => {
      if (stat.value !== 0) playerStats.push(stat);
    });
  });
  return playerStats;
}

let counter = 0;

//function that loops through the json looking for api's in the properties of $ref
//then runs the api and replaces the $ref with the data from the api
async function resolve_ref(ref_data) {
  for (const i in ref_data) {
    if (i === "$ref") {
      const playerJson = await getNFLLeagueData(ref_data["$ref"] + "?");
      const team = playerJson["team"]
        ? await getNFLLeagueData(playerJson["team"]["$ref"] + "?")
        : undefined;
      const stats = playerJson["stats"]
        ? await getStats(playerJson["stats"]["$ref"] + "?")
        : undefined;
      ref_data["id"] = playerJson["id"];
      ref_data["firstName"] = playerJson["firstName"];
      ref_data["lastName"] = playerJson["lastName"];
      ref_data["displayName"] = playerJson["displayName"];
      ref_data["weight"] = playerJson["weight"];
      ref_data["displayWeight"] = playerJson["displayWeight"];
      ref_data["height"] = playerJson["height"];
      ref_data["displayHeight"] = playerJson["displayHeight"];
      ref_data["age"] = playerJson["age"];
      ref_data["dateOfBirth"] = playerJson["dateOfBirth"];
      ref_data["birthPlace"] = playerJson["birthPlace"];
      ref_data["jersey"] = playerJson["jersey"];
      ref_data["debutYear"] = playerJson["debutYear"];
      ref_data["headshot"] = playerJson["headshot"]?.["href"];
      ref_data["position"] = playerJson["position"]?.["displayName"];
      ref_data["positionAbbrv"] = playerJson["position"]?.["abbreviation"];
      ref_data["team"] = team["displayName"];
      ref_data["stats"] = stats;
      ref_data["draft"] = {
        year: playerJson["draft"]?.["year"],
        round: playerJson["draft"]?.["round"],
        pick: playerJson["draft"]?.["selection"],
        displayText: playerJson["draft"]?.["displayText"],
      };
      ref_data["status"] = playerJson["status"]?.["type"];
      counter++;
      console.log("Completed player " + counter + " of 17998");
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
    // const bulkOps = updatedPlayers.map((player) => ({
    //   updateOne: {
    //     filter: { "playerObject.id": player["playerObject"]["id"] },
    //     update: { $set: { playerObject: player["playerObject"] } },
    //     upsert: true,
    //   },
    // }));
    // await players.bulkWrite(bulkOps);

    res.json(updatedPlayers);
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
