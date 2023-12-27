class Game {
  constructor(data = {}) {
    this._id = data._id;
    this.week = data.week;
    this.date = data.date;
    this.name = data.name;
    this.shortName = data.shortName;
    this.seasonType = data.seasonType;
    this.homeTeam = data.homeTeam;
    this.awayTeam = data.awayTeam;
    this.completed = data.completed;
    this.divGame = data.divGame;
    this.conGame = data.conGame;
  }

  getFullName() {
    return `${this.displayName}`;
  }
}

module.exports = Game;
