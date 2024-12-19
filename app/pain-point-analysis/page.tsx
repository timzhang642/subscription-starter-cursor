'use client';

import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Container, Paper, CircularProgress, Link, Divider, Collapse } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format } from 'date-fns';

// Add triangle icon component
const ToggleIcon = ({ isExpanded }: { isExpanded: boolean }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-block',
      width: 0,
      height: 0,
      borderLeft: '4px solid transparent',
      borderRight: '4px solid transparent',
      borderTop: '6px solid currentColor',
      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
      transition: 'transform 0.2s ease',
      mr: 1
    }}
  />
);

// Platform logo components
const TwitterLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const getFaviconUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch (e) {
    return null;
  }
};

const PlatformIcon = ({ platform, url }: { platform: string; url?: string }) => {
  const [faviconError, setFaviconError] = useState(false);
  
  const iconStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    overflow: 'hidden'
  };

  switch (platform.toLowerCase()) {
    case 'twitter':
      return (
        <Box sx={iconStyle}>
          <TwitterLogo />
        </Box>
      );
    case 'linkedin':
      return (
        <Box sx={iconStyle}>
          <LinkedInLogo />
        </Box>
      );
    default:
      if (url && !faviconError) {
        const faviconUrl = getFaviconUrl(url);
        if (faviconUrl) {
          return (
            <Box sx={iconStyle}>
              <Box
                component="img"
                src={faviconUrl}
                alt={platform}
                onError={() => setFaviconError(true)}
                sx={{
                  width: 16,
                  height: 16,
                  objectFit: 'contain'
                }}
              />
            </Box>
          );
        }
      }
      // Fallback to first letter of platform name if favicon fails or URL is not available
      return (
        <Box sx={iconStyle}>
          <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>
            {platform.charAt(0).toUpperCase()}
          </Typography>
        </Box>
      );
  }
};

const PainPointCard = ({ painPoint }: { painPoint: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 2, 
        backgroundColor: 'rgba(255, 255, 255, 0.09)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {painPoint.point}
        </Typography>
      </Box>

      <Box 
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          mt: 2,
          '&:hover': {
            opacity: 0.8
          }
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ToggleIcon isExpanded={isExpanded} />
          Mentions ({painPoint.sources.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {painPoint.sources.map((source: any, i: number) => (
            <PlatformIcon key={i} platform={source.platform} url={source.url} />
          ))}
        </Box>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ mt: 2 }}>
          {painPoint.sources.map((source: any, sIndex: number) => (
            <Box 
              key={sIndex}
              sx={{ 
                mb: 2,
                p: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 1,
                '&:last-child': { mb: 0 }
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 2,
                mb: 2
              }}>
                <PlatformIcon platform={source.platform} url={source.url} />
                <Box sx={{ flex: 1 }}>
                  <Link 
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      color: 'white',
                      textDecoration: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {source.title}
                  </Link>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '0.875rem'
                    }}
                  >
                    {format(new Date(source.date), 'MMM d, yyyy')}
                  </Typography>
                </Box>
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontStyle: 'italic',
                  color: 'rgba(255, 255, 255, 0.9)',
                  pl: 2,
                  borderLeft: '2px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                "{source.evidence}"
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
};

interface SearchHistory {
  id: string;
  industry: string;
  results: {
    text: string;
  };
  created_at: string;
}

export default function PainPointAnalysis() {
  const [industry, setIndustry] = useState('');
  const [results, setResults] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Check authentication and load search history on component mount
  useEffect(() => {
    const checkAuthAndLoadHistory = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/signin');
        return;
      }

      // Load search history
      const { data: history, error: historyError } = await supabase
        .from('pain_point_searches')
        .select('*')
        .order('created_at', { ascending: false });

      if (!historyError && history) {
        setSearchHistory(history);
      }
      setIsLoadingHistory(false);
    };
    checkAuthAndLoadHistory();
  }, [router, supabase]);

  // Create a custom theme for the dark background
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      error: {
        main: '#d32f2f',
        dark: '#b71c1c',
      }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
          containedError: {
            backgroundColor: '#d32f2f',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#b71c1c',
            },
          },
        },
      },
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/signin');
        return;
      }

      const response = await fetch('https://hook.us1.make.com/3q7bad3p5i76y1xvoqgzd6of12grodjh', {
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
      
      // Clean up the response text
      const cleanedText = responseText.replace(/^Raw response:\s*/, '');
      setResults(cleanedText);

      // Store the search in the database with user_id
      const { error: insertError } = await supabase
        .from('pain_point_searches')
        .insert({
          user_id: session.user.id,
          industry: industry.trim(),
          results: { text: cleanedText }  // Store as JSON object
        });

      if (insertError) {
        console.error('Error storing search:', insertError);
      } else {
        // Reload search history
        const { data: history } = await supabase
          .from('pain_point_searches')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (history) {
          setSearchHistory(history);
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze industry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (searchId: string) => {
    try {
      // Get current user's session to ensure we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/signin');
        return;
      }

      // Delete the record from Supabase
      const { error } = await supabase
        .from('pain_point_searches')
        .delete()
        .match({ 
          id: searchId,
          user_id: session.user.id  // Ensure we only delete user's own records
        });

      if (error) {
        console.error('Error deleting search:', error);
        return;
      }

      // Update the local state to remove the deleted item
      setSearchHistory(prevHistory => 
        prevHistory.filter(search => search.id !== searchId)
      );

      // Verify deletion by reloading the search history
      const { data: updatedHistory, error: fetchError } = await supabase
        .from('pain_point_searches')
        .select('*')
        .order('created_at', { ascending: false });

      if (!fetchError && updatedHistory) {
        setSearchHistory(updatedHistory);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const renderResults = (results: { text: string } | string) => {
    try {
      const text = typeof results === 'string' ? results : results.text;
      const data = JSON.parse(text);
      const sortedPainPoints = [...data.painPoints].sort((a, b) => b.frequency - a.frequency);

      return (
        <Box sx={{ 
          fontFamily: 'system-ui',
          color: 'white',
        }}>
          {sortedPainPoints.map((painPoint: any, index: number) => (
            <PainPointCard key={index} painPoint={painPoint} />
          ))}
        </Box>
      );
    } catch (error) {
      // Fallback to original text display if JSON parsing fails
      console.error('Error parsing results:', error);
      return (
        <Box sx={{ 
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          color: 'white',
          pl: 2,
          borderLeft: '2px solid rgba(255, 255, 255, 0.2)',
          overflowX: 'auto',
          maxWidth: '100%'
        }}>
          {typeof results === 'string' ? results : results.text}
        </Box>
      );
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

          {results && (
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
                Pain Point Analysis:
              </Typography>
              {renderResults(results)}
            </Paper>
          )}

          {/* Search History Section */}
          {!isLoadingHistory && searchHistory.length > 0 && (
            <Box sx={{ mt: 6 }}>
              <Typography variant="h5" gutterBottom sx={{ color: 'white' }}>
                Search History
              </Typography>
              {searchHistory.map((search) => (
                <Paper
                  key={search.id}
                  elevation={3}
                  sx={{
                    p: 3,
                    mt: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.09)',
                    color: 'white'
                  }}
                >
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h6" component="h3">
                        {search.industry}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {format(new Date(search.created_at), 'MMM d, yyyy h:mm a')}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => handleDelete(search.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                  <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                  {renderResults(search.results)}
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
} 