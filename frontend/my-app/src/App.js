import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import PlayerDashboard from "./components/PlayerDashboard";

function App() {
  const theme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PlayerDashboard />
    </ThemeProvider>
  );
}

export default App;
