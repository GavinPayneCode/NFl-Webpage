const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");

//base url needed to get the data
const url =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams?";

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
      ref_data["teamObject"] = await response.data;
      delete ref_data["$ref"];
    } else if (typeof ref_data[i] === "object") {
      await resolve_ref(ref_data[i]);
    }
  }
  return ref_data;
}

//function that loops through all the pages of the api and returns the data
async function allTeams(url) {
  let combinedJsonData = [];
  for (let i = 1; i <= 2; i++) {
    const jsonData = await getNFLLeagueData(url, i);
    //jsonData.items is being passed into the resolve_ref function because the api gives us unwanted information
    //so using the .items to only get the teams url is need to keep the variable clean
    const resolvedJsonData = await resolve_ref(jsonData.items);
    combinedJsonData = combinedJsonData.concat(resolvedJsonData);
  }
  return combinedJsonData;
}

//base route for the database connection to get pass through
//then connects to the teams collection
router.use((req, res, next) => {
  teams = req.db.collection("teams");
  next();
});

//route for getting the teams from the database with the filter and sort parameters
router.route("/").get(async (req, res) => {
  try {
    res.json(
      await teams.find(req.params.filter).sort(req.params.sort).toArray()
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

//route for updating the teams in the database
//this is only 32 api calls way less then players and they should theratically never ned to be ran
//unless the teams change a logo or name so instead of trying to update the teams in the database
//when this is ran it just deletes all the teams and then reinserts them from the api
router.route("/update").get(async (req, res) => {
  try {
    await teams.deleteMany({});
    await teams.insertMany(await allTeams(url));
    res.json("teams updated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
