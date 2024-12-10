import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import PainPointAnalysis from './components/PainPointAnalysis';

function App() {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Pain Point Analyzer
          </Typography>
          <Button color="inherit" component={Link} to="/">Home</Button>
          <Button color="inherit" component={Link} to="/pain-point-analysis">Pain Point Analysis</Button>
        </Toolbar>
      </AppBar>

      <Container>
        <Box sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<div>Welcome to Pain Point Analyzer</div>} />
            <Route path="/pain-point-analysis" element={<PainPointAnalysis />} />
          </Routes>
        </Box>
      </Container>
    </Router>
  );
}

export default App; 