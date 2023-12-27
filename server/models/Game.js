const mongoose = require("mongoose");

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

module.exports = mongoose.model("Game", gameSchema);
