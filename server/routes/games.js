const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");

//base url needed to get the data
const url =
  "http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2023?";

//function to get the data from the api
async function getNFLLeagueData(url, page) {
  if (page === undefined) page = 1;
  const response = await axios.get(url + "page=" + page);
  const jsonData = await response.data;
  return jsonData;
}

//function that gets the api's for the games this week
async function getCurrentWeekEvents(url) {
  const response = await getNFLLeagueData(url);
  const eventsURL = await getNFLLeagueData(response.type.week.events.$ref);
  return eventsURL;
}

//function that loops through the json looking for api's in the properties of $ref
//then runs the api and replaces the $ref with the data from the api
async function resolve_ref(ref_data) {
  for (const i in ref_data) {
    if (i === "$ref") {
      const response = await axios.get(ref_data["$ref"]);
      ref_data["gameObject"] = await response.data;
      delete ref_data["$ref"];
    } else if (typeof ref_data[i] === "object") {
      await resolve_ref(ref_data[i]);
    }
  }
  return ref_data;
}

//base route for the database connection to get pass through
//then connects to the games collection
router.use((req, res, next) => {
  games = req.db.collection("games");
  next();
});

//route for getting the games from the database with the filter and sort parameters
router.route("/").get(async (req, res) => {
  try {
    res.json(await games.find({}).toArray());
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

//route for updating the games in the database
//this would need to be ran every week to get the new games
router.route("/update").get(async (req, res) => {
  try {
    const refEvents = await getCurrentWeekEvents(url);
    const Events = await resolve_ref(refEvents.items);
    games.deleteMany({});
    games.insertMany(Events);
    res.json("Games updated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
