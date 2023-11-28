const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const puppeteer = require("puppeteer");
const fs = require("fs");
const { start } = require("repl");

let pLimit;

// Dynamically import p-limit
import('p-limit').then((module) => {
  pLimit = module.default;
});

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
    const playersData = await players
      .find(
        { fullName: { $exists: true } },
        { projection: { _id: 0, fullName: 1, id: 1, $ref: 1 } }
      )
      .toArray();
    res.send(playersData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/updateStats").get(async (req, res) => {
  try {
    let updatedPlayers = [];
    const playersArray = await players.find().skip(10000).limit(10).toArray();

    const promises = playersArray.map((player) => {
      return axios
        .get(
          "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/athletes/" +
            player.id +
            "/statistics"
        )
        .then((response) => {
          const playerStats = [];
          response.data.splits.categories.map((category) => {
            category.stats.map((stat) => {
              if (stat.value !== 0) playerStats.push(stat);
            });
          });
          updatedPlayers.push({
            id: player.id,
            fullName: player.fullName,
            stats: playerStats,
          });
        });
    });

    await Promise.all(promises);
    res.send(updatedPlayers);
  } catch (err) {
    console.error(err);
    res.json({ message: "No stats for this player" });
  }
});



router.route("/updateArkansas").get(async (req, res) => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });

    const page = await browser.newPage();
    await page.goto("https://arkansasrazorbacks.com/sport/m-footbl/roster/");

    const sportsURL = await page.evaluate(async () => {
      const sportURLs = Array.from(
        document.querySelectorAll(
          "#menu-bordeaux-menu > li:nth-child(1) > div > div > div > ul > li"
        )
      );
      allSports = [];
      sportURLs.forEach((sport) => {
        const sportName = sport.querySelector("a").innerText.trim();
        let sportURL = sport.querySelector("ul > li:nth-child(2) > a").href;

        // Check if the URL ends with 'roster'. If not, append it.
        if (!sportURL.endsWith("roster/")) {
          sportURL += "roster/";
        }

        allSports.push({ name: sportName, url: sportURL });
      });
      return allSports;
    });
    page.close();

    allYears = [];

    for (let i = 0; i < sportsURL.length - 1; i++) {
      const page = await browser.newPage();
      await page.goto(sportsURL[i].url);

      const years = await page.evaluate(async () => {
        try {
          const year = Array.from(
            document.querySelector(
              "#wrapper > section > div.container > div:nth-child(1) > div > ul > li.pull-right > select"
            ).options
          );
          if (year.length === 0)
            return [{ number: "problems", url: "problems" }];
          allYears = [];
          year.forEach((option) => {
            allYears.push({ number: option.innerText, url: option.value });
          });
          return allYears;
        } catch (err) {
          console.log("Porblem: " + page.url());
          console.log("Sports: " + sportsURL[i].url);
        }
      });
      allYears = allYears.concat(await years);
      page.close();
    }

    allPlayers = [];

    for (let i = 0; i < allYears.length - 1; i++) {
      const page = await browser.newPage();
      await page.goto(allYears[i].url);

      const players = await page.evaluate(async () => {
        const rowElements = document.querySelectorAll(
          "#DataTables_Table_0 > tbody > tr"
        );

        const headerElements = document.querySelectorAll(
          "#DataTables_Table_0 > thead > tr"
        );

        allHeaders = [];
        headerElements.forEach((header) => {
          const headers = header.querySelectorAll("th");
          headers.forEach((header) => {
            allHeaders.push(header.innerText);
          });
        });

        // Create a new Set to store player identifiers
        const playerSet = new Set();

        allCells = [];
        rowElements.forEach((row) => {
          const cells = row.querySelectorAll("td");
          let playerData = {};
          cells.forEach((cell, index) => {
            playerData[allHeaders[index].trim()] = cell.innerText.trim();
          });

          allCells.push(playerData);
        });
        return allCells;
      });

      allPlayers = allPlayers.concat(players);
      page.close();
    }

    // Create a new Set to store player identifiers
    const playerSet = new Set();
    allPlayers = allPlayers.filter((player) => {
      const playerId = player.Name + "-" + player.Hometown;
      if (!playerSet.has(playerId)) {
        playerSet.add(playerId);
        return true;
      }
      return false;
    });
    browser.close();

    arkansasPlayers = req.db.collection("Arkansas");
    await arkansasPlayers.deleteMany({});
    await arkansasPlayers.insertMany(allPlayers);

    res.json("updated arkansas players");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/updateAlabama").get(async (req, res) => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("https://rolltide.com");

    const sportsURL = await page.evaluate(async () => {
      const sportGroups = Array.from(
        document.querySelectorAll(
          "#aspnetForm > header > div > div > div > nav > navigation-component > div > div.c-navigation-desktop.flex-item-1 > ul > li.main-navigation-sports.c-navigation__item.c-navigation__item--level-1.c-navigation__parent.sidearm-haspopup > div > div > div.flex > ul"
        )
      );
      const allSports = [];

      sportGroups.forEach((group) => {
        const sports = Array.from(
          group.querySelectorAll(
            "li > a.c-navigation__url.c-navigation__url--level-2.c-navigation__schedule-roster-news.roster"
          )
        );

        sports.forEach((sport) => {
          allSports.push({ url: sport.href });
        });
      });

      return allSports;
    });

    console.log(sportsURL);
    page.close();

    const allYears = [];


    const limit = pLimit(5); // Limit to 5 concurrent tabs

    const yearPromises = sportsURL.map((sport, i) => limit(async () => {
      const page = await browser.newPage();
      await page.goto(sport.url);

      const years = await page.evaluate(() => {
        try {
          const year = Array.from(
            document.querySelector("#ddl_past_rosters").options
          );
          if (year.length === 0)
            return [{ number: "problems", url: "problems" }];
          allYears = [];
          year.forEach((option) => {
            allYears.push({ number: option.innerText, url: option.value });
          });
          return allYears;
        } catch (err) {
          console.log("Sports: ");
        }
      });
      try {
        allYears.push(...years);
      } catch (err) {
        console.log("Sports: " + sport.url);
      }
      page.close();
    }));

    await Promise.all(yearPromises);

    const playerPromises = allYears.map((year, i) => limit(async () => {
      const page = await browser.newPage();
      await page.goto("https://rolltide.com/" + year.url + "?view=2");

      const players = await page.evaluate(() => {
        const rowElements = document.querySelectorAll(
          "#DataTables_Table_0 > tbody > tr"
        );

        const headerElements = document.querySelectorAll(
          "#DataTables_Table_0 > thead > tr"
        );

        allHeaders = [];
        headerElements.forEach((header) => {
          const headers = header.querySelectorAll("th");
          headers.forEach((header) => {
            allHeaders.push(header.innerText);
          });
        });

        // Create a new Set to store player identifiers
        const playerSet = new Set();

        allCells = [];
        rowElements.forEach((row) => {
          const cells = row.querySelectorAll("td");
          let playerData = {};
          cells.forEach((cell, index) => {
            playerData[allHeaders[index].trim()] = cell.innerText.trim();
          });

          allCells.push(playerData);
        });
        return allCells;
      });

      allPlayers.push(...players);
      page.close();
    }));

    await Promise.all(playerPromises);

    // Create a new Set to store player identifiers
    const playerSet = new Set();
    let noHometownCount = 0;

    allPlayers = allPlayers.filter((player) => {
      let playerId;
      if (player["HOMETOWN / HIGH SCHOOL"]) {
        const hometownHighSchool = player["HOMETOWN / HIGH SCHOOL"].split("/");
        const hometown = hometownHighSchool[0].trim();
        const highSchool = hometownHighSchool[1]
          ? hometownHighSchool[1].trim()
          : "";
        playerId = player["FULL NAME"] + "-" + highSchool;
      } else {
        noHometownCount++;
        console.log(`No hometown count: ${noHometownCount}`);
        playerId = player["FULL NAME"] + "-" + player["#"];
      }
      if (!playerSet.has(playerId)) {
        playerSet.add(playerId);
        return true;
      }
      return false;
    });
    browser.close();

    res.json(allPlayers);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/update").get(async (req, res) => {
  allPlayerData = [];
  totalPlayers = 0;
  urlList = [
    "http://sports.core.api.espn.com/v2/sports/baseball/leagues/college-baseball/seasons/",
    "http://sports.core.api.espn.com/v2/sports/baseball/leagues/college-softball/seasons/",
    "http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/",
    "http://sports.core.api.espn.com/v2/sports/basketball/leagues/womens-college-basketball/seasons/",
    "http://sports.core.api.espn.com/v2/sports/soccer/leagues/usa.ncaa.m.1/seasons/",
    "http://sports.core.api.espn.com/v2/sports/soccer/leagues/usa.ncaa.w.1/seasons/",
    "http://sports.core.api.espn.com/v2/sports/volleyball/leagues/mens-college-volleyball/seasons/",
    "http://sports.core.api.espn.com/v2/sports/volleyball/leagues/womens-college-volleyball/seasons/",
    "http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/",
  ];

  teamIDList = [2, 8, 99, 145, 245, 333, 344, 57, 61, 96, 142, 238, 2579, 2633];

  let idSet = new Set();

  for (let teamID of teamIDList) {
    let promises = []; // Array to hold all promises

    for (let baseUrl of urlList) {
      for (let i = 2024; i > 2009; i--) {
        const url = baseUrl + i + "/teams/" + teamID + "/athletes?limit=1000";

        // Push the promise into the array
        promises.push(
          axios
            .get(url)
            .then(async (data) => {
              totalPlayers += data.data.items.length;

              // Create an array to hold the promises for the additional requests
              let playerPromises = [];

              data.data.items.forEach((player) => {
                let parts = player.$ref.split("/");
                let id = parts[parts.length - 1].split("?")[0];

                if (!idSet.has(id)) {
                  // Push the promise into the array and add a catch block
                  playerPromises.push(
                    axios.get(player.$ref).catch((err) => {
                      console.log(`Error on link: ${player.$ref}`, err);
                      return null; // Return null if there's an error
                    })
                  );
                  idSet.add(id);
                }
              });

              // Wait for all promises to resolve and add the results to allPlayerData
              let playerData = await Promise.all(playerPromises);
              playerData = playerData.map((response) =>
                response ? response.data : null
              );
              allPlayerData.push(...playerData.filter((data) => data !== null));

              console.log("got data from: " + url);
            })
            .catch((err) => {
              console.log("Error: " + err + " on link: " + url);
            })
        );
      }
    }

    // Wait for all promises to resolve
    await Promise.all(promises);
  }
  await players.deleteMany({});
  await players.insertMany(allPlayerData);
  res.json(allPlayerData);
});

module.exports = router;
