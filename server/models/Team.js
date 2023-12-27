const mongoose = require("mongoose");

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

module.exports = mongoose.model("Team", teamSchema);
