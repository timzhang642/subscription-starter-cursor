'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Paper, CircularProgress, Link } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

export default function PainPointAnalysis() {
  const [industry, setIndustry] = useState('');
  const [results, setResults] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a custom theme for the dark background
  const darkTheme = createTheme({
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.09)',
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.23)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#90caf9',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
            '& .MuiOutlinedInput-input': {
              color: 'rgba(255, 255, 255, 0.9)',
            },
          },
        },
      },
    },
  });

  const handleAnalyze = async () => {
    if (!industry.trim()) {
      setError('Please enter an industry or profession');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('https://hook.us1.make.com/pmvkmtyjr29vf2xq7t7ttq15tgbni3fs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ industry: industry.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze industry');
      }

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      // Extract URLs from the response
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = responseText.match(urlRegex) || [];
      
      // Clean up URLs (remove any trailing punctuation)
      const cleanUrls = urls.map(url => url.replace(/[.,]+$/, ''));
      
      setResults(cleanUrls);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze industry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ color: 'white' }}>
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
              error={!!error}
              helperText={error}
              disabled={isLoading}
            />
            
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              onClick={handleAnalyze}
              sx={{ mt: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Analyze'}
            </Button>
          </Box>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {results && results.length > 0 && (
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                mt: 4, 
                backgroundColor: 'rgba(255, 255, 255, 0.09)',
                color: 'white'
              }}
            >
              <Typography variant="h6" gutterBottom>
                Relevant Resources:
              </Typography>
              <Box component="ul" sx={{ 
                listStyle: 'none',
                p: 0,
                m: 0,
                '& li': {
                  mb: 2,
                  pl: 2,
                  borderLeft: '2px solid rgba(255, 255, 255, 0.2)',
                }
              }}>
                {results.map((url, index) => (
                  <li key={index}>
                    <Link 
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        color: '#90caf9',
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        }
                      }}
                    >
                      {url}
                    </Link>
                  </li>
                ))}
              </Box>
            </Paper>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
} 