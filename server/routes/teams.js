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
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams?limit=1000&";

const teamSchema = new mongoose.Schema(
  {
    _id: Number,
    location: String,
    displayName: String,
    abbreviation: String,
    color: String,
    alternateColor: String,
    logo: String,
    conference: String,
    division: String,
    conSlug: String,
    games: [{ type: Number, ref: "Game" }],
  },
  { versionKey: false }
);

const Team = mongoose.model("Team", teamSchema);

async function getNFLLeagueData(url, page = 1) {
  try {
    const response = await limiter.schedule(() =>
      axios.get(`${url}page=${page}`)
    );
    return response.data;
  } catch (err) {
    console.error(`${url} failed`);
    throw err;
  }
}

function createTeam(teamJson) {
  return new Team({
    _id: teamJson["id"],
    location: teamJson["location"],
    displayName: teamJson["displayName"],
    abbreviation: teamJson["abbreviation"],
    color: teamJson["color"],
    alternateColor: teamJson["alternateColor"],
    logo: teamJson["logos"]?.[0]?.["href"],
    conference: teamJson["conference"],
    division: teamJson["division"],
    conSlug: teamJson["conSlug"],
    games: teamJson["games"],
  });
}

async function addGames(teamJson) {
  try {
    const gameLinks = await getNFLLeagueData(teamJson["events"]["$ref"] + "&");
    const games = [];
    for (const urls of gameLinks["items"]) {
      const gameID = urls["$ref"].split("?")[0].split("/").pop();
      games.push(gameID);
    }
    teamJson["games"] = games;
    return teamJson;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function addGroup(teamJson) {
  try {
    const group = await getNFLLeagueData(teamJson["groups"]["$ref"] + "&");
    teamJson["conference"] = group["name"].split(" ")[0];
    teamJson["division"] = group["name"].split(" ")[1];
    teamJson["conSlug"] = group["slug"];
    return teamJson;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function addTeams(urlList) {
  try {
    const teamPromises = urlList.map((ref) =>
      getNFLLeagueData(ref["$ref"])
        .then((teamJson) => addGames(teamJson))
        .then((teamJson) => addGroup(teamJson))
    );
    const teamJsonArray = await Promise.all(teamPromises);
    const teams = teamJsonArray.map((teamJson) => createTeam(teamJson));
    await Team.insertMany(teams);
  } catch (err) {
    console.error("Failed to save teams: ", err);
  }
}

async function allTeams(url) {
  try {
    await Team.deleteMany({});
    const data = await getNFLLeagueData(url);
    await addTeams(data.items);
  } catch (err) {
    console.error(err);
  }
}

function getRecord(team) {
  const games = team["games"].filter(
    (game) => game.seasonType === 2 && game.completed === true
  );
  const wins = games.filter(
    (game) =>
      (game.homeTeam.team === team._id && game.homeTeam.winner) ||
      (game.awayTeam.team === team._id && game.awayTeam.winner)
  ).length;
  const losses = games.length - wins;
  return { wins, losses, games };
}

function headToHead(teamA, teamB) {
  const matchups = teamA["games"].filter((gameA) =>
    teamB["games"].some((gameB) => gameA._id === gameB._id)
  );

  const teamAWins = getWinsInMatchups(teamA, matchups);
  const teamBWins = getWinsInMatchups(teamB, matchups);

  if (teamAWins > teamBWins) {
    return teamA;
  } else if (teamAWins < teamBWins) {
    return teamB;
  } else {
    return null;
  }
}

function getWinsInMatchups(team, matchups) {
  return matchups.filter(
    (game) =>
      (game.homeTeam.team === team._id && game.homeTeam.winner) ||
      (game.awayTeam.team === team._id && game.awayTeam.winner)
  ).length;
}

function sweepHeadToHead(teams) {
  const won = [];
  const middle = [];
  const lost = [];
  const final = [];
  for (let i = 0; i < teams.length; i++) {
    const teamA = teams[i];
    let wins = 0;
    let losses = 0;
    for (let j = 0; j < teams.length; j++) {
      if (i === j) {
        continue;
      }
      const teamB = teams[j];
      const winner = headToHead(teamA, teamB);
      if (winner === teamA) {
        wins++;
      } else if (winner === teamB) {
        losses++;
      }
    }
    if (wins === teams.length - 1) {
      won.push(teamA);
    } else if (losses === teams.length - 1) {
      lost.push(teamA);
    } else {
      middle.push(teamA);
    }
  }

  if (won.length > 0 && won.length < teams.length) {
    if (won.length === 1) {
      final.push(won[0]);
    } else {
      wildSort(won);
      final.push(won);
    }
  }
  if (middle.length > 0 && middle.length < teams.length) {
    if (middle.length === 1) {
      final.push(middle[0]);
    } else {
      wildSort(middle);
      final.push(middle);
    }
  }
  if (lost.length > 0 && lost.length < teams.length) {
    if (lost.length === 1) {
      final.push(lost[0]);
    } else {
      wildSort(lost);
      final.push(lost);
    }
  }

  if (final.length === 0) {
    return null;
  }

  return final.flat();
}

function getDivisionWins(team) {
  return team["games"].filter(
    (game) =>
      ((game.homeTeam.team === team._id && game.homeTeam.winner) ||
        (game.awayTeam.team === team._id && game.awayTeam.winner)) &&
      game.divGame
  ).length;
}

function getConferenceWins(team) {
  return team["games"].filter(
    (game) =>
      ((game.homeTeam.team === team._id && game.homeTeam.winner) ||
        (game.awayTeam.team === team._id && game.awayTeam.winner)) &&
      game.conGame
  ).length;
}

function sortedConferenceWins(teams) {
  const groups = {};

  for (const team of teams) {
    const confWins = getConferenceWins(team);
    if (groups[confWins]) {
      groups[confWins].push(team);
    } else {
      groups[confWins] = [team];
    }
  }

  let groupedTeams = Object.values(groups);

  if (groupedTeams.length === 1) {
    return null;
  }

  groupedTeams = groupedTeams.sort(
    (a, b) => getConferenceWins(b[0]) - getConferenceWins(a[0])
  );

  groupedTeams.map((group) => {
    if (group.length > 1) {
      wildSort(group);
    }
  });

  return groupedTeams.flat();
}

function getCommonGameWins(teamA, teamB) {
  const opponents = teamB["games"].map((game) =>
    game.homeTeam.team === teamB._id ? game.awayTeam.team : game.homeTeam.team
  );
  return teamA["games"].filter(
    (game) =>
      ((game.homeTeam.team === teamA._id && game.homeTeam.winner) ||
        (game.awayTeam.team === teamA._id && game.awayTeam.winner)) &&
      opponents.includes(game.awayTeam.team)
  ).length;
}

function getMultiCommonGameWins(teamA, teams) {
  let total = 0;
  for (const teamB of teams) {
    const comWins = getCommonGameWins(teamA, teamB);
    total += comWins;
  }

  return total;
}

function sortedCommonGameWins(teams) {
  const groups = {};

  for (const team of teams) {
    const comWins = getMultiCommonGameWins(team, teams);
    if (groups[comWins]) {
      groups[comWins].push(team);
    } else {
      groups[comWins] = [team];
    }
  }

  let groupedTeams = Object.values(groups);

  if (groupedTeams.length === 1) {
    return null;
  }

  groupedTeams = groupedTeams.sort(
    (a, b) =>
      getMultiCommonGameWins(b[0], teams) - getMultiCommonGameWins(a[0], teams)
  );

  groupedTeams.map((group) => {
    if (group.length > 1) {
      wildSort(group);
    }
  });

  return groupedTeams.flat();
}

function divTie(teamA, teamB) {
  //Head-to-head (best won-lost-tied percentage in games between the clubs).
  const headToHeadWinner = headToHead(teamA, teamB);
  if (headToHeadWinner)
    if (headToHeadWinner)
      // console.log(headToHeadWinner, " head to head winner div tie");
      return headToHeadWinner;
  //Best won-lost-tied percentage in games played within the division.
  const teamADivWins = getDivisionWins(teamA);
  const teamBDivWins = getDivisionWins(teamB);
  if (teamADivWins !== teamBDivWins) {
    return teamADivWins > teamBDivWins ? teamA : teamB;
  }
  //Best won-lost-tied percentage in common games.
  const teamACommonWins = getCommonGameWins(teamA, teamB);
  const teamBCommonWins = getCommonGameWins(teamB, teamA);
  if (teamACommonWins !== teamBCommonWins) {
    return teamACommonWins > teamBCommonWins ? teamA : teamB;
  }
  //Best won-lost-tied percentage in games played within the conference.
  const teamAConfWins = getConferenceWins(teamA);
  const teamBConfWins = getConferenceWins(teamB);
  if (teamAConfWins !== teamBConfWins) {
    return teamAConfWins > teamBConfWins ? teamA : teamB;
  }
  // console.log(teamA, teamB, "ran out of div tiebreakers");
  return teamA;
}

[0, 1, 2, 3, 4, 5];

function wildTie(teamA, teamB) {
  if (teamA.conSlug === teamB.conSlug) {
    return divTie(teamA, teamB);
  }
  //Head-to-head, if applicable.
  const headToHeadWinner = headToHead(teamA, teamB);
  if (headToHeadWinner)
    if (headToHeadWinner)
      // console.log(headToHeadWinner, " head to head winner wild tie");
      return headToHeadWinner;
  //Best won-lost-tied percentage in games played within the conference.
  const teamAConfWins = getConferenceWins(teamA);
  const teamBConfWins = getConferenceWins(teamB);
  if (teamAConfWins !== teamBConfWins) {
    return teamAConfWins > teamBConfWins ? teamA : teamB;
  }
  //Best won-lost-tied percentage in common games, minimum of four.
  const teamACommonWins = getCommonGameWins(teamA, teamB);
  const teamBCommonWins = getCommonGameWins(teamB, teamA);
  if (teamACommonWins !== teamBCommonWins) {
    return teamACommonWins > teamBCommonWins ? teamA : teamB;
  }
  // console.log(teamA, teamB, "ran out of wild tiebreakers");
  return teamA;
}

function manyWildTie(teams, final = []) {
  let divTeams = [];
  let tiedTeams = [];
  for (let teamA of teams) {
    if (
      teams.some((teamB) => teamB !== teamA && teamB.conSlug === teamA.conSlug)
    ) {
      divTeams.push(teamA);
    } else {
      tiedTeams.push(teamA);
    }
  }
  if (divTeams.length > 0) {
    if (divTeams.length === 1) {
      tiedTeams.push(divTeams.shift());
    } else {
      divSort(divTeams);
      tiedTeams.push(divTeams.shift());
    }
  }

  if (tiedTeams.length === 1) {
    final.push(teams.shift());
    return final;
  }

  teams = getTopWild(tiedTeams).concat(divTeams);
  final.push(teams.shift());
  return manyWildTie(teams, final);
}

function getTopWild(teams) {
  const sweepWinner = sweepHeadToHead(teams);
  if (sweepWinner) return sweepWinner;
  //Best won-lost-tied percentage in games played within the conference.
  const confSort = sortedConferenceWins(teams);
  if (confSort) return confSort;
  //Best won-lost-tied percentage in common games, minimum of four.
  const comSort = sortedCommonGameWins(teams);
  if (comSort) return comSort;
}

function divSort(teams) {
  teams.sort((a, b) => {
    aWinPercentage = a.wins / (a.wins + a.losses);
    bWinPercentage = b.wins / (b.wins + b.losses);
    if (aWinPercentage !== bWinPercentage)
      return bWinPercentage - aWinPercentage;
    return divTie(a, b) === a ? -1 : 1;
  });
}

function wildSort(wildCardContenders) {
  if (wildCardContenders.length === 1) {
    return wildCardContenders;
  }
  wildCardContenders.sort((a, b) => {
    const aWinPercentage = a.wins / (a.wins + a.losses);
    const bWinPercentage = b.wins / (b.wins + b.losses);

    if (aWinPercentage !== bWinPercentage) {
      return bWinPercentage - aWinPercentage;
    } else {
      const sameWinPercentageTeams = wildCardContenders.filter((team) => {
        const teamWinPercentage = team.wins / (team.wins + team.losses);
        return teamWinPercentage === aWinPercentage;
      });

      if (sameWinPercentageTeams.length > 2) {
        const sortedTeams = manyWildTie(sameWinPercentageTeams);
        return sortedTeams.indexOf(a) - sortedTeams.indexOf(b);
      } else {
        return wildTie(a, b) === a ? -1 : 1;
      }
    }
  });
}

function playoffStandings(teams) {
  const AFC = {
    East: [],
    North: [],
    South: [],
    West: [],
  };
  const NFC = {
    East: [],
    North: [],
    South: [],
    West: [],
  };
  teams = teams.map((team) => {
    const record = getRecord(team);
    return {
      ...team._doc,
      games: record.games,
      wins: record.wins,
      losses: record.losses,
    };
  });

  teams.forEach((team) => {
    if (team.conference === "AFC") {
      AFC[team.division].push(team);
    } else {
      NFC[team.division].push(team);
    }
  });

  const remainingAFC = [];
  const remainingNFC = [];
  const AFCPlayoffStandings = [];
  const NFCPlayoffStandings = [];

  for (const div in AFC) {
    divSort(AFC[div]);
    AFCPlayoffStandings.push(AFC[div][0]);
    for (let i = 1; i < AFC[div].length; i++) {
      remainingAFC.push(AFC[div][i]);
    }
  }

  for (const div in NFC) {
    divSort(NFC[div]);
    NFCPlayoffStandings.push(NFC[div][0]);
    for (let i = 1; i < NFC[div].length; i++) {
      remainingNFC.push(NFC[div][i]);
    }
  }

  divSort(AFCPlayoffStandings);
  divSort(NFCPlayoffStandings);

  wildSort(remainingAFC);
  wildSort(remainingNFC);

  AFCPlayoffStandings.push(...remainingAFC);
  NFCPlayoffStandings.push(...remainingNFC);

  return {
    AFCPlayoffStandings,
    NFCPlayoffStandings,
  };
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
    const gameFilter = req.query.gameFilter
      ? JSON.parse(req.query.gameFilter)
      : {};
    const result = await Team.find(filter)
      .sort(sort)
      .populate({
        path: "games",
        match: gameFilter,
        populate: {
          path: "homeTeam.team awayTeam.team",
          select: showTeam,
        },
        select: showGame,
      })
      .select(showTeam);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/update").get(async (req, res) => {
  try {
    await allTeams(url);
    res.json("done");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

router.route("/playoffStandings").get(async (req, res) => {
  try {
    const teams = await Team.find({}).populate("games");
    const standings = playoffStandings(teams);
    res.json({
      AFC: standings.AFCPlayoffStandings.map(({ games, ...team }) => team),
      NFC: standings.NFCPlayoffStandings.map(({ games, ...team }) => team),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
