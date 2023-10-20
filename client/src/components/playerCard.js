import React, { useEffect, useState } from "react";
import axios from "axios";

function PlayerCard(props) {
  //grabbing variables from props
  const { field, value, playerStats, playerSearch } = props;

  //initializing state variable for all the players
  const [playerData, setPlayerData] = useState([]);

  //useEffect function that will run when the field, value, or playerSearch variables change
  //field and value variable change when the buttons on the navBar are clicked
  //playerSeach changes when someone starts typing in the search bar
  useEffect(() => {
    //setting up a cancel token to cancel the axios request if another one is made before the first one is finished
    let cancel;

    //axios request to get the players from the database with the filter and sort parameters
    axios({
      method: "GET",
      url: "/players",
      params: {
        sort: { [field]: value },
        filter: {
          $and: [
            { "playerObject.headshot.href": { $exists: true } },
            playerSearch,
          ],
        },
      },
      cancelToken: new axios.CancelToken((c) => (cancel = c)),
    })
      .then((res) => {
        setPlayerData(res.data);
      })
      .catch((e) => {
        if (axios.isCancel(e)) return;
      });
    return () => cancel();
  }, [field, value, playerSearch]);

  return (
    <div
      className="countainer-fluid bg-secondary col-md-10 offset-2"
      style={{ marginTop: "6rem" }}
    >
      {/* only will create the player cards if there is player data */}
      {playerData.length !== 0 ? (
        <div className="row">
          {/* map out the playerData array to create a card for each player */}
          {playerData.map((player) => (
            <div
              className="col-sm-2 mb-3 mb-sm-50 w-500"
              key={player.playerObject.id}
            >
              <div className="card border-primary bg-black bg-opacity-25 text-black">
                {player.playerObject.headshot ? (
                  <img
                    src={player.playerObject.headshot.href}
                    className="card-img-top img-fluid"
                    alt={player.playerObject.headshot.alt}
                    onClick={() => playerStats(player.playerObject.id)}
                  />
                ) : (
                  <img
                    src="https://www.wellpower.org/wp-content/uploads/2017/12/placeholder-man.png"
                    className="card-img-top img-fluid w-75 align-self-center"
                    alt={player.playerObject.fullName}
                    onClick={() => playerStats(player.playerObject.id)}
                  />
                )}
                <div className="card-body">
                  <h5 className="card-title">{player.playerObject.fullName}</h5>
                  <div className="card-text d-flex justify-content-between">
                    <div className="left-text">
                      {player.playerObject.position.name}
                    </div>
                    <div className="right-text">
                      {player.playerObject.jersey}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}

export default PlayerCard;
