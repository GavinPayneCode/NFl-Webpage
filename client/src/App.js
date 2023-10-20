import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.css";
import PlayerCard from "./components/playerCard";
import NavBar from "./components/navBar";
import LeftInfoBar from "./components/leftInfoBar";
import LeftLiveData from "./components/leftLiveData";
import "./App.css";

function App() {
  //initializing state variables that go between components
  const [field, setField] = useState("playerObject.fullName");
  const [value, setValue] = useState(1);
  const [id, setId] = useState(null);
  const [playerSearch, setPlayerSearch] = useState(null);

  //functions that change state variables that go between components
  const handleSort = (field) => {
    setField(field);
  };

  const toggleSortValue = () => {
    if (value === 1) {
      setValue(-1);
    } else {
      setValue(1);
    }
  };

  const playerStats = (id) => {
    setId(id);
  };

  const handleSearch = (event) => {
    setPlayerSearch({
      "playerObject.fullName": { $regex: event.target.value },
    });
  };

  //using bootstrap throughout the website to help with styling
  return (
    <div className="container-fluid bg-secondary " style={{ paddingLeft: "0" }}>
      <NavBar
        handleSort={handleSort}
        toggleSortValue={toggleSortValue}
        handleSearch={handleSearch}
      />
      <div className="row">
        <div className="col-md-2 position-fixed" style={{ marginTop: "6rem" }}>
          <LeftInfoBar id={id} />
          <LeftLiveData />
        </div>
        <PlayerCard
          field={field}
          value={value}
          playerStats={playerStats}
          playerSearch={playerSearch}
        />
      </div>
    </div>
  );
}

export default App;
