import React, { useEffect, useState } from "react";
import axios from "axios";

function LeftInfoBar(props) {
  //grabbing variables from props and initializing state variables for player data and stats
  const { id } = props;
  const [playerStats, setPLayerStats] = useState([]);
  const [playerData, setPlayerData] = useState([]);

  //useEffect that runs when id variables changes
  //id changes when the user clicks on an player card image
  useEffect(() => {
    //won't run api if there is no id yet
    if (id === null) return;

    //axios request to get the players data and stats from the database with the filter and sort parameters
    axios
      .get("/players/stats/" + id)
      .then((res) => {
        setPLayerStats(res.data);
      })
      .catch((error) => console.error(error));

    axios({
      method: "GET",
      url: "/players",
      params: { filter: { "playerObject.id": id } },
    }).then((res) => {
      setPlayerData(res.data[0]);
    });
  }, [id]);

  return (
    <div className="info-container-fluid bg-opacity-25 bg-primary border-primary">
      {/* makes sure there is data in Stats and data also if player has no stats give return No Stats available */}
      {playerStats.length !== 0 ? (
        playerStats.message === undefined && playerData.length !== 0 ? (
          <div>
            <h3>Player: {playerData.playerObject.firstName}</h3>
            <ul className="list-group list-group-flush">
              {/* map through stats to show all stats in array */}
              {playerStats.map((stat, i) => (
                <div
                  className="d-flex w-100 justify-content-between list-group-item bg-secondary border-primary bg-opacity-25 text-black"
                  key={stat.name + i}
                >
                  <h5 className="mb-1">{stat.displayName}:</h5>
                  <p className="fs-6 mb-1 align-middle">{stat.displayValue}</p>
                </div>
              ))}
            </ul>
          </div>
        ) : (
          <h5>No stats available for this player</h5>
        )
      ) : (
        <h5>Click a player to see stats about them</h5>
      )}
    </div>
  );
}

export default LeftInfoBar;
