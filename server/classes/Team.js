class Team {
  constructor(data = {}) {
    this._id = data._id;
    this.location = data.location;
    this.displayName = data.displayName;
    this.abbreviation = data.abbreviation;
    this.color = data.color;
    this.alternateColor = data.alternateColor;
    this.logo = data.logo;
    this.conference = data.conference;
    this.division = data.division;
    this.conSlug = data.conSlug;
    this.games = data.games;
  }

  getFullName() {
    return `${this.displayName}`;
  }
}

module.exports = Team;
