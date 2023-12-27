const express = require("express");
const cors = require("cors");
const playerRouter = require("./routes/players");
const gameRouter = require("./routes/games");
const teamRouter = require("./routes/teams");

const app = express();
const port = 8000;
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("You made it!");
});

app.use("/players", playerRouter);
app.use("/games", gameRouter);
app.use("/teams", teamRouter);

app.listen(port, () => {
  console.log("Server is running on port:" + port);
});
