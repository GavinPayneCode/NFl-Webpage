const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const puppeteer = require("puppeteer");

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
        { projection: { _id: 0, fullName: 1, id: 1 } }
      )
      .skip(10000)
      .limit(1000)
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

router.route("/updateSEC").get(async (req, res) => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (
        req.resourceType() == "stylesheet" ||
        req.resourceType() == "font" ||
        req.resourceType() == "image"
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });
    //document.querySelector("#menu-bordeaux-menu > li:nth-child(1) > div > div > div > ul > li:nth-child(1) > ul")
    await page.goto("https://arkansasrazorbacks.com/sport/m-footbl/roster/");

    const sportsURL = await page.evaluate(() => {
      const sportURLs = Array.from(
        document.querySelectorAll(
          "#menu-bordeaux-menu > li:nth-child(1) > div > div > div > ul > li"
        )
      );
      allSports = [];
      sportURLs.forEach((sport) => {
        const sportName = sport.querySelector("a").innerText.trim();
        const sportURL = sport.querySelector("ul > li:nth-child(2) > a").href;
        allSports.push({ name: sportName, url: sportURL });
      });
      return allSports;
    });

    // Get all years from the dropdown
    const yearsURL = await page.evaluate(() => {
      const yearOptions = Array.from(
        document.querySelector(
          "#wrapper > section > div.container > div:nth-child(1) > div > ul > li.pull-right > select"
        ).options
      );
      allYears = [];
      yearOptions.forEach((option) => {
        allYears.push({ year: option.innerText, url: option.value });
      });
      return allYears;
    });

    let allPlayerData = [];

    // Start scraping for each sport
    const sportPromises = sportsURL.map(async (sport) => {
      // Start scraping for each year in parallel
      const yearPromises = yearsURL.map(async (yearURL) => {
        const page = await browser.newPage();

        try {
          await page.goto(sport.url + "?season=" + yearURL.year);
          console.log(sport.url + "?season=" + yearURL.year);

          const playerData = await page.evaluate(
            ({ year }, { name }) => {
              const players = [];
              const playerElements = document.querySelectorAll(
                "#roster > div > div > div > div > table > tbody > tr"
              );

              if (playerElements.length === 0) return players;

              for (const element of playerElements) {
                try {
                  const cells = element.querySelectorAll("td");
                  const playerFullName = cells[1].innerText;
                  const PlayerHomeTown = cells[6].innerText;
                  const playerHighSchool = cells[7].innerText
                    .split("/")[0]
                    .trim();

                  players.push({
                    fullName: playerFullName,
                    hometown: PlayerHomeTown,
                    highSchool: playerHighSchool,
                    lastPlayedYear: year,
                    sport: name,
                  });
                } catch (err) {
                  break;
                }
              }

              return players;
            },
            yearURL,
            sport
          );

          await page.close();

          return playerData;
        } catch (err) {
          console.error(err);
        }
      });

      // Wait for all year promises to resolve
      const results = await Promise.all(yearPromises);

      // Flatten the results array
      allPlayerData = allPlayerData.concat(...results);

      return allPlayerData;
    });

    // Wait for all sport promises to resolve
    const sportResults = await Promise.all(sportPromises);

    // Flatten the sportResults array
    allPlayerData = sportResults.flat();

    await browser.close();

    res.json(allPlayerData);
  } catch (err) {
    console.error(err);
    res.json({ message: "error" });
  }
});

router.route("/update").get(async (req, res) => {
  allPlayerData = [];
  page = 1;
  for (let i = 1; i <= 214; i++) {
    playerData = await axios.get(
      "https://sports.core.api.espn.com/v3/sports/football/college-football/athletes?limit=1000&page=" +
        i
    );
    allPlayerData = allPlayerData.concat(playerData.data.items);
    console.log("Finished page: ", i);
  }
  players.deleteMany({});
  players.insertMany(allPlayerData);

  res.json("players have been updated");
});

module.exports = router;
