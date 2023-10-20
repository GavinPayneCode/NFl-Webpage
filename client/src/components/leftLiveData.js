import React, { useEffect, useState } from "react";
import axios from "axios";

function LeftLiveData() {
  //initializing state variables for game and week data
  const [games, setGames] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    //axios request to get the game and week data
    axios
      .get("/games")
      .then((res) => {
        setGames(res.data);
      })
      .catch((error) => console.error(error));

    axios
      .get("/teams")
      .then((res) => {
        setTeams(res.data);
      })
      .catch((error) => console.error(error));
  }, []);

  return (
    <div className="live-container-fluid mt-4 bg-primary bg-opacity-25 border-primary">
      <div>
        <h3>Games: </h3>
        <ul className="list-group list-group-flush">
          {/* map through games to get all games */}
          {games.map((game) => (
            <div
              className="d-flex w-100 justify-content-between list-group-item bg-secondary border-primary bg-opacity-25 text-black"
              key={game.gameObject.id}
            >
              <img
                //   this variable will look through the teams data
                //   and finds which team is represented by the team id given to us from the game data
                //   once the team is found it grabs the teams logo image
                src={
                  teams.find(
                    (team) =>
                      team.teamObject.id ===
                      game.gameObject.competitions[0].competitors[1].id
                  )?.teamObject?.logos[0]?.href
                }
                className="img-fluid w-25"
                alt={"logo"}
              ></img>
              <h5 className="fs-6">{game.gameObject.shortName}</h5>
              <img
                //   same thing with the image here but for home team
                //   the difference between home and away is competitors[0] for home
                //  and competitors[1] for away
                src={
                  teams.find(
                    (team) =>
                      team.teamObject.id ===
                      game.gameObject.competitions[0].competitors[0].id
                  )?.teamObject?.logos[0]?.href
                }
                className="img-fluid w-25"
                alt={"logo"}
              ></img>
            </div>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default LeftLiveData;
