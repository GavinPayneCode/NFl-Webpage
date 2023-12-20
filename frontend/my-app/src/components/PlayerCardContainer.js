import React, { useEffect, useState } from "react";
import axios from "axios";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Grid from "@mui/material/Grid";
import PlayerCard from "./PlayerCard";

const PlayerCardContainer = () => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await axios.get("http://localhost:8000/players/", {
          params: {
            filter: JSON.stringify({ headshot: { $exists: true } }),
          },
        });
        setPlayers(response.data);
        console.log(response.data);
      } catch (error) {
        console.error("Failed to fetch players:", error);
      }
    };

    fetchPlayers();
  }, []);
  return (
    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
      <Toolbar />
      <Container maxWidth={false}>
        <Grid container spacing={3}>
          {players.map((player) => (
            <Grid item lg={3} key={player._id}>
              <PlayerCard player={player} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default PlayerCardContainer;
