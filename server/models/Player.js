const mongoose = require("mongoose");

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

module.exports = mongoose.model("Player", playerSchema);
