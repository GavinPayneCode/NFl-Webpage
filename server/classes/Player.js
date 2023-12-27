class Player {
  constructor(data) {
    this._id = data._id;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.displayName = data.displayName;
    this.weight = data.weight;
    this.displayWeight = data.displayWeight;
    this.height = data.height;
    this.displayHeight = data.displayHeight;
    this.age = data.age;
    this.dateOfBirth = data.dateOfBirth;
    this.birthPlace = data.birthPlace;
    this.jersey = data.jersey;
    this.debutYear = data.debutYear;
    this.headshot = data.headshot;
    this.position = data.position;
    this.positionAbbrv = data.positionAbbrv;
    this.team = data.team;
    this.draft = data.draft;
    this.status = data.status;
  }

  getName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

module.exports = Player;
