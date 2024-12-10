import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Paper } from '@mui/material';

const PainPointAnalysis = () => {
  const [industry, setIndustry] = useState('');
  const [results, setResults] = useState(null);

  const handleAnalyze = async () => {
    // TODO: Replace with actual API call
    // This is just a placeholder response
    setResults([
      "Limited time management solutions",
      "High operational costs",
      "Customer acquisition challenges",
      "Regulatory compliance burden"
    ]);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Industry Pain Point Analysis
        </Typography>
        
        <Box sx={{ my: 4 }}>
          <TextField
            fullWidth
            label="Enter Industry or Profession"
            variant="outlined"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Healthcare, Real Estate, Education"
          />
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={handleAnalyze}
            sx={{ mt: 2 }}
          >
            Analyze
          </Button>
        </Box>

        {results && (
          <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Key Pain Points:
            </Typography>
            <ul>
              {results.map((point, index) => (
                <li key={index}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {point}
                  </Typography>
                </li>
              ))}
            </ul>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default PainPointAnalysis; 