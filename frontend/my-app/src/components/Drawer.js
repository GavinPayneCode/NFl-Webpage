import React, { useEffect, useState } from "react";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import axios from "axios";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";

const drawerWidth = 240;

const SideDrawer = () => {
  const [games, setGames] = useState([]);

  useEffect(() => {
    const fetchGames = async () => {
      const response = await axios.get(
        'http://localhost:8000/games/?filter={"week":15}'
      );
      setGames(response.data);
    };

    fetchGames();
  }, []);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <List>
        {games.map((game) => (
          <ListItem button key={game._id}>
            <ListItemAvatar>
              <Avatar src={game.homeTeam.logo} alt={game.homeTeam.name} />
            </ListItemAvatar>
            <ListItemText primary={game.shortName} />
            <ListItemAvatar>
              <Avatar src={game.awayTeam.logo} alt={game.awayTeam.name} />
            </ListItemAvatar>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default SideDrawer;
