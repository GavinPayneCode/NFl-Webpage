const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const Bottleneck = require("bottleneck");

const limiter = new Bottleneck({
  maxConcurrent: 100, // Maximum number of requests running at the same time
  minTime: 1, // Minimum time between each request
});

//ufSOnKtJwIUec21Fkda8XnEolheMu1FRmiJXaqKNIRiC9VV3qMrdfhs6eq22Gnl2

//function to get the data from the api
async function getNFLLeagueData(url, page = 1) {
  try {
    const response = await limiter.schedule(() =>
      axios.get(`${url}page=${page}`)
    );
    return response.data;
  } catch (err) {
    if (err.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (err.response.status === 404) {
        console.log(`URL doesn't exist: ${url}`);
        return null;
      } else if (err.response.status === 403) {
        console.error("Timed out server");
      } else {
        console.error(`HTTP error ${err.response.status} occurred`);
      }
    } else if (err.request) {
      // The request was made but no response was received
      console.error("No response received");
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error", err.message);
    }
  }
}

let counter = 0;

const playerSchema = new mongoose.Schema(
  {
    _id: Number,
    firstName: String,
    lastName: String,
    displayName: String,
    weight: Number,
    displayWeight: String,
    height: Number,
    displayHeight: String,
    age: Number,
    dateOfBirth: String,
    birthPlace: {
      city: String,
      state: String,
      country: String,
    },
    jersey: Number,
    debutYear: Number,
    headshot: String,
    position: String,
    positionAbbrv: String,
    team: { type: Number, ref: "Team" },
    draft: {
      year: Number,
      round: Number,
      pick: Number,
      displayText: String,
    },
    status: String,
    stats: [
      {
        name: String,
        displayName: String,
        shortDisplayName: String,
        description: String,
        abbreviation: String,
        value: Number,
        displayValue: String,
      },
    ],
  },
  { versionKey: false }
);

const Player = mongoose.model("Player", playerSchema);

//function that loops through the json looking for api's in the properties of $ref
//then runs the api and replaces the $ref with the data from the api
function createPlayer(playerJson) {
  return new Player({
    _id: Number(playerJson["id"]),
    firstName: playerJson["firstName"],
    lastName: playerJson["lastName"],
    displayName: playerJson["displayName"],
    weight: playerJson["weight"],
    displayWeight: playerJson["displayWeight"],
    height: playerJson["height"],
    displayHeight: playerJson["displayHeight"],
    age: playerJson["age"],
    dateOfBirth: playerJson["dateOfBirth"],
    birthPlace: playerJson["birthPlace"],
    jersey: playerJson["jersey"],
    debutYear: playerJson["debutYear"],
    headshot: playerJson["headshot"]?.["href"],
    position: playerJson["position"]?.["displayName"],
    positionAbbrv: playerJson["position"]?.["abbreviation"],
    team: playerJson["team"]?.["$ref"].split("?")[0].split("/").pop(),
    draft: {
      year: playerJson["draft"]?.["year"],
      round: playerJson["draft"]?.["round"],
      pick: playerJson["draft"]?.["selection"],
      displayText: playerJson["draft"]?.["displayText"],
    },
    status: playerJson["status"]?.["type"],
  });
}

async function addPlayers(urlList) {
  try {
    const playerPromises = urlList.map((ref) => {
      return getNFLLeagueData(ref["$ref"]);
    });
    const playerJsonArray = await Promise.all(playerPromises);
    const players = playerJsonArray.map((playerJson) =>
      createPlayer(playerJson)
    );
    await Player.insertMany(players);
    console.log(
      `Completed players ${counter} to ${counter + players.length} of 17998`
    );
    counter += players.length;
  } catch (err) {
    console.error("Failed to save players: ", err);
  }
}

async function allPlayers(url, pages) {
  try {
    await Player.deleteMany({});
    const requests = Array.from({ length: pages }, (_, i) =>
      getNFLLeagueData(url, i + 1).then((data) => data.items)
    );
    const responses = await Promise.all(requests);
    const combinedJsonData = responses.flat();

    for (let i = 0; i < combinedJsonData.length; i += 100) {
      const slice = combinedJsonData.slice(i, i + 100);
      await addPlayers(slice);
    }
  } catch (err) {
    console.error(err);
  }
}

//route for getting the players from the database with the filter and sort parameters
router.route("/").get(async (req, res) => {
  try {
    console.log(req.query.filter);
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    const sort = req.query.sort ? JSON.parse(req.query.sort) : {};
    const showPlayer = req.query.showPlayer
      ? req.query.showPlayer.replace(/,/g, " ")
      : "";
    const showTeam = req.query.showTeam
      ? req.query.showTeam.replace(/,/g, " ")
      : "";
    const result = await Player.find(filter)
      .sort(sort)
      .limit(500)
      .populate("team", showTeam)
      .select(showPlayer);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

//route for getting the stats of a player with a players id
router.route("/update/stats").get(async (req, res) => {
  try {
    console.log("Fetching player IDs...");
    // Get all player IDs
    const playerIds = await Player.find({}, "_id statistics");
    console.log(`Fetched ${playerIds.length} player IDs`);

    // Create an array of promises for the API requests and database updates
    const promises = playerIds.map(async (player) => {
      console.log(`Fetching stats for player ${player._id}...`);
      const playerStatsApi = await getNFLLeagueData(
        "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/" +
          player._id +
          "/statistics?"
      );
      console.log(`Fetched stats for player ${player._id}`);

      if (!playerStatsApi) {
        console.log(`No stats found for player ${player._id}`);
        return null;
      }
      // There are multiple categories of stats so this loops through all of them and adds them to an array
      // Then only returns the stats that are not 0
      const playerStats = await playerStatsApi.splits.categories.reduce(
        (acc, category) => {
          const nonZeroStats = category.stats.filter(
            (stat) => stat.value !== 0
          );
          return [...acc, ...nonZeroStats];
        },
        []
      );

      // Prepare the player's stats for batch update
      return {
        updateOne: {
          filter: { _id: player._id },
          update: { stats: playerStats },
        },
      };
    });

    console.log("Waiting for all promises to resolve...");
    // Wait for all the promises to resolve
    const updates = (await Promise.all(promises)).filter(Boolean);
    console.log("All promises resolved");

    console.log("Performing batch update...");
    // Perform batch update
    await Player.bulkWrite(updates);
    console.log("Batch update completed");

    res.json({ message: "Stats updated for all players" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

//base url needed to get the data
const url =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes?limit=1000&";

//route for updating the players in the database
//will rerun the api call and check to see if the player is already in the database
//if a player is already in the dataabse there information will be updated
//if a player is not in the database they will be added to the database
//this is usefull to run at the start of each new season
router.route("/update").get(async (req, res) => {
  try {
    await allPlayers(url, 18);
    res.json("done");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
