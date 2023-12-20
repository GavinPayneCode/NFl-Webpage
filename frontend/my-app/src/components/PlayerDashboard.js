import React from "react";
import Box from "@mui/material/Box";
import TopAppBar from "./AppBar";
import SideDrawer from "./Drawer";
import PlayerCardContainer from "./PlayerCardContainer";

const PlayerDashboard = () => {
  return (
    <Box sx={{ display: "flex" }}>
      <TopAppBar />
      <SideDrawer />
      <PlayerCardContainer />
    </Box>
  );
};

export default PlayerDashboard;
