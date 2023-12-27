const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const Bottleneck = require("bottleneck");

const limiter = new Bottleneck({
  maxConcurrent: 200,
  minTime: 1,
});

const url =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=1000&dates=20230803-20240112";

const gameSchema = new mongoose.Schema(
  {
    _id: Number,
    week: Number,
    date: String,
    name: String,
    shortName: String,
    seasonType: Number,
    homeTeam: {
      team: { type: Number, ref: "Team" },
      score: Number,
      winner: Boolean,
    },
    awayTeam: {
      team: { type: Number, ref: "Team" },
      score: Number,
      winner: Boolean,
    },
    completed: Boolean,
    divGame: Boolean,
    conGame: Boolean,
  },
  { versionKey: false }
);

const Game = mongoose.model("Game", gameSchema);

async function getNFLLeagueData(url) {
  try {
    const response = await limiter.schedule(() => axios.get(url));
    return response.data;
  } catch (err) {
    console.error(`${url} failed`);
    throw err;
  }
}

function createGame(gameJson) {
  return new Game({
    _id: gameJson["id"],
    week: gameJson["week"]["number"],
    date: gameJson["date"],
    name: gameJson["name"],
    shortName: gameJson["shortName"],
    seasonType: gameJson["season"]["type"],
    homeTeam: {
      team: gameJson["competitions"][0]["competitors"][0]["id"],
      score: gameJson["competitions"][0]["competitors"][0]["score"],
      winner: gameJson["competitions"][0]["competitors"][0]["winner"],
    },
    awayTeam: {
      team: gameJson["competitions"][0]["competitors"][1]["id"],
      score: gameJson["competitions"][0]["competitors"][1]["score"],
      winner: gameJson["competitions"][0]["competitors"][1]["winner"],
    },
    completed: gameJson["status"]["type"]["completed"],
  });
}

async function allGames(url) {
  try {
    await Game.deleteMany({});
    const data = await getNFLLeagueData(url);
    const games = data["events"].map((gameJson) => createGame(gameJson));
    await Game.insertMany(games);
  } catch (err) {
    console.error(err);
  }
}

router.route("/").get(async (req, res) => {
  try {
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    const sort = req.query.sort ? JSON.parse(req.query.sort) : {};
    const showTeam = req.query.showTeam
      ? req.query.showTeam.replace(/,/g, " ")
      : "";
    const showGame = req.query.showGame
      ? req.query.showGame.replace(/,/g, " ")
      : "";
    const result = await Game.find(filter)
      .sort(sort)
      .populate("homeTeam.team", showTeam)
      .populate("awayTeam.team", showTeam)
      .select(showGame);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/update").get(async (req, res) => {
  try {
    await allGames(url);
    res.json("done");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/update/divConGame").get(async (req, res) => {
  try {
    const games = await Game.find({ completed: true, seasonType: 2 })
      .populate("homeTeam.team")
      .populate("awayTeam.team");
    const conGame = games.filter(
      (game) => game.homeTeam.team.conference === game.awayTeam.team.conference
    );
    for (let game of conGame) {
      game.conGame = true;
      if (game.homeTeam.team.conSlug === game.awayTeam.team.conSlug) {
        game.divGame = true;
      }
      await game.save();
    }
    res.json("done");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/playOffTeams").get(async (req, res) => {
  try {
    const games = await Game.find({ completed: true, seasonType: 2 });
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
