// PlayerCard.js
import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import { CardActionArea } from "@mui/material";

const PlayerCard = ({ player }) => {
  return (
    <Card>
      <CardActionArea>
        <CardMedia
          component="img"
          height="200"
          image={player.headshot}
          alt={player.displayName}
        />
        <CardContent>
          <Typography gutterBottom variant="h5" component="div">
            {player.displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {player.position} - {player.team.displayName}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default PlayerCard;
