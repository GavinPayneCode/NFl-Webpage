const Player = require("../models/Player");
const Team = require("../models/Team");
const Game = require("../models/Game");
const axios = require("axios");
const mongoose = require("mongoose");
const Bottleneck = require("bottleneck");

class DatabaseHandler {
  constructor() {
    this.mongoose = require("mongoose");
    this.mongoose.connect(
      "mongodb+srv://g2payne11:stop@cluster0.egw2sc9.mongodb.net/testdb?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
      }
    );
  }

  url =
    "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes?limit=1000&";
  pages = 18;

  limiter = new Bottleneck({
    maxConcurrent: 500,
    minTime: 1,
  });

  async getNFLLeagueData(url, page = 1) {
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

  async getAllPlayers() {
    try {
      console.log("Getting all players");
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

  createPlayer(playerJson) {
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

  async addPlayers(urlList) {
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

  async updatePlayers() {
    try {
      return getAllPlayers();
    } catch (err) {
      console.error(err);
      throw new Error("Failed to update player");
    }
  }
}

module.exports = DatabaseHandler;
