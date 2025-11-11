import React, { useState, useEffect } from 'react'
import { 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Box,
  Paper,
  Card,
  CardContent,
  CardMedia,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton
} from '@mui/material'
import { 
  CheckCircle as CheckIcon,
  MenuBook as BookIcon,
  Engineering as EngineeringIcon,
  Construction as ConstructionIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Login as LoginIcon,
  Logout as LogoutIcon
} from '@mui/icons-material'
import constructionBookCover from './assets/construction-book-cover.png'
import { paymentHelpers } from './lib/payments'
import { authHelpers } from './lib/supabase'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Success from './Success'
import Cancel from './Cancel'
import './App.css'

function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [openAuthDialog, setOpenAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [authError, setAuthError] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' })
  
  // Product info
  const productId = 'prod_TOxfTJThUzdap9'
  const priceId = 'price_1SS9k0IzqsLaUerSVwWNe0ns'
  
  useEffect(() => {
    // Check if user is authenticated
    if (authToken) {
      setLoading(true)
      authHelpers.getCurrentUser(authToken)
        .then(userData => {
          setUser(userData)
          // Check if user has purchased the book
          return paymentHelpers.verifyPurchase(productId, authToken)
        })
        .then(verification => {
          setHasPurchased(verification.hasPurchased || false)
        })
        .catch(error => {
          console.error('Auth error:', error)
          // Clear invalid token
          localStorage.removeItem('auth_token')
          setAuthToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    }
  }, [authToken])
  
  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    setLoading(true)
    
    try {
      if (authMode === 'signin') {
        // Sign in - CRITICAL: Get BOTH user and token from response
        const { user: signedInUser, token } = await authHelpers.signIn(authForm.email, authForm.password)
        
        // IMMEDIATELY update state (don't wait for useEffect)
        localStorage.setItem('auth_token', token)
        setAuthToken(token)
        setUser(signedInUser) // Set user immediately!
        
        // Re-check purchase status immediately after sign in
        try {
          const verification = await paymentHelpers.verifyPurchase(productId, token)
          setHasPurchased(verification.hasPurchased || false)
        } catch (error) {
          // Purchase check failed, but user is signed in
          console.error('Purchase check error:', error)
          setHasPurchased(false)
        }
        
        setOpenAuthDialog(false)
        setSnackbar({
          open: true,
          message: 'Successfully signed in!',
          severity: 'success'
        })
      } else {
        // Sign up
        await authHelpers.signUp(authForm.email, authForm.password, authForm.name)
        
        // After signup, sign in automatically - CRITICAL: Get BOTH user and token
        const { user: signedUpUser, token } = await authHelpers.signIn(authForm.email, authForm.password)
        
        // IMMEDIATELY update state (don't wait for useEffect)
        localStorage.setItem('auth_token', token)
        setAuthToken(token)
        setUser(signedUpUser) // Set user immediately!
        
        // Re-check purchase status (user just signed up, so likely no purchases yet)
        setHasPurchased(false)
        
        setOpenAuthDialog(false)
        setSnackbar({
          open: true,
          message: 'Account created successfully!',
          severity: 'success'
        })
      }
    } catch (error) {
      console.error('Auth error:', error)
      setAuthError(error.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSignOut = async () => {
    try {
      if (authToken) {
        await authHelpers.signOut(authToken)
      }
      localStorage.removeItem('auth_token')
      setAuthToken(null)
      setUser(null)
      setHasPurchased(false)
      setSnackbar({
        open: true,
        message: 'Successfully signed out',
        severity: 'success'
      })
    } catch (error) {
      console.error('Sign out error:', error)
      setSnackbar({
        open: true,
        message: 'Failed to sign out. Please try again.',
        severity: 'error'
      })
    }
  }
  
  const handleBuyNow = async () => {
    try {
      setLoading(true)
      // If user is authenticated, include their email
      const options = {}
      if (user) {
        options.customerEmail = user.email
      }
      await paymentHelpers.redirectToCheckout(priceId, options)
    } catch (error) {
      console.error('Checkout error:', error)
      setSnackbar({
        open: true,
        message: error.message || 'Failed to start checkout. Please try again.',
        severity: 'error'
      })
      setLoading(false)
    }
  }
  
  const handleDownload = async () => {
    try {
      setLoading(true)
      await paymentHelpers.downloadProduct(productId, authToken)
      setSnackbar({
        open: true,
        message: 'Download started!',
        severity: 'success'
      })
    } catch (error) {
      console.error('Download error:', error)
      setSnackbar({
        open: true,
        message: error.message || 'Failed to download. Please try again.',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleAuthFormChange = (e) => {
    const { name, value } = e.target
    setAuthForm(prev => ({ ...prev, [name]: value }))
  }
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }
  
  return (
    <Router>
      <Routes>
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/" element={
          <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Auth Status */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        {user ? (
          <Box display="flex" alignItems="center">
            <Typography variant="body2" mr={2}>
              Signed in as {user.name || user.email}
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<LogoutIcon />}
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </Box>
        ) : (
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<LoginIcon />}
            onClick={() => {
              setAuthMode('signin')
              setOpenAuthDialog(true)
            }}
          >
            Sign In
          </Button>
        )}
      </Box>
      
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h2" component="h1" gutterBottom color="primary" className="book-title">
          Construction Book
        </Typography>
        <Typography variant="h5" color="text.secondary">
          The Ultimate Guide for Construction Professionals
        </Typography>
      </Box>

      {/* Main Content */}
      <Grid container spacing={4} alignItems="center">
        {/* Book Cover */}
        <Grid item xs={12} md={5}>
          <Card elevation={6} className="book-cover-card">
            <CardMedia
              component="img"
              alt="Construction Book Cover"
              image={constructionBookCover}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/400x500?text=Construction+Book';
              }}
              className="book-cover"
            />
          </Card>
        </Grid>

        {/* Book Details */}
        <Grid item xs={12} md={7}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" component="h2" gutterBottom>
              About This Book
            </Typography>
            
            <Typography variant="body1" paragraph>
              "Construction Book" is the comprehensive guide that every construction professional needs. 
              Whether you're a seasoned contractor, project manager, or just starting in the industry, 
              this book provides valuable insights, practical techniques, and expert knowledge to help 
              you excel in your construction career.
            </Typography>
            
            <Typography variant="body1" paragraph>
              Written by industry experts with decades of experience, this book covers everything from 
              project planning and management to the latest construction technologies and safety protocols.
            </Typography>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h5" gutterBottom>
              What You'll Learn:
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Effective project management techniques specific to construction" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Cost estimation and budgeting strategies" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Safety protocols and regulatory compliance" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Modern construction technologies and materials" />
              </ListItem>
            </List>
            
            <Box mt={4} className="price-section">
              <Typography variant="h4" component="div" color="primary" gutterBottom>
                $50.00
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                One-time purchase, instant digital download
              </Typography>
              
              {loading ? (
                <Box display="flex" justifyContent="center" mt={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : hasPurchased ? (
                <Button 
                  variant="contained" 
                  color="success"
                  size="large"
                  startIcon={<DownloadIcon />}
                  className="buy-button"
                  onClick={handleDownload}
                  sx={{ mt: 2, py: 1.5, px: 4 }}
                >
                  Download Book
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  size="large"
                  startIcon={<BookIcon />}
                  className="buy-button"
                  onClick={handleBuyNow}
                  sx={{ mt: 2, py: 1.5, px: 4 }}
                  disabled={loading}
                >
                  Buy Now
                </Button>
              )}
              
              {!user && !hasPurchased && (
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Guest checkout available. Sign in for permanent access.
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Features Section */}
      <Box mt={6}>
        <Typography variant="h4" component="h2" gutterBottom textAlign="center">
          Why Choose This Book?
        </Typography>
        <Grid container spacing={3} mt={1}>
          <Grid item xs={12} sm={4}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <EngineeringIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Expert Knowledge
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Written by industry professionals with over 30 years of combined experience in construction management
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <ConstructionIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Practical Techniques
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Real-world examples and case studies you can apply immediately to your projects
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <BookIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Comprehensive Coverage
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Over 300 pages of detailed content covering all aspects of modern construction
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Testimonials */}
      <Box mt={6} mb={4}>
        <Typography variant="h4" component="h2" gutterBottom textAlign="center">
          What Readers Say
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="body1" paragraph className="testimonial">
                  "This book transformed how I approach construction projects. The ROI strategies alone saved me thousands on my first project after reading."
                </Typography>
                <Typography variant="subtitle2" color="primary">
                  — Michael T., Project Manager
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="body1" paragraph className="testimonial">
                  "As someone new to the industry, this book gave me the confidence and knowledge I needed to succeed. Highly recommended for beginners and experts alike."
                </Typography>
                <Typography variant="subtitle2" color="primary">
                  — Sarah L., Construction Engineer
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="body1" paragraph className="testimonial">
                  "The most comprehensive construction guide I've found in 15 years of working in this industry. Worth every penny."
                </Typography>
                <Typography variant="subtitle2" color="primary">
                  — Robert J., General Contractor
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Footer CTA */}
      <Box mt={6} textAlign="center" className="footer-cta">
        <Paper elevation={3} sx={{ p: 4, backgroundColor: 'primary.light' }}>
          <Typography variant="h4" component="h2" gutterBottom color="white">
            Ready to Elevate Your Construction Knowledge?
          </Typography>
          <Typography variant="body1" paragraph color="white">
            Get your copy of "Construction Book" today and transform your approach to construction projects.
          </Typography>
          {loading ? (
            <CircularProgress color="secondary" />
          ) : hasPurchased ? (
            <Button 
              variant="contained" 
              size="large"
              color="success"
              startIcon={<DownloadIcon />}
              sx={{ mt: 2, py: 1.5, px: 6 }}
              className="cta-button"
              onClick={handleDownload}
            >
              Download Your Book
            </Button>
          ) : (
            <Button 
              variant="contained" 
              size="large"
              color="secondary"
              sx={{ mt: 2, py: 1.5, px: 6 }}
              className="cta-button"
              onClick={handleBuyNow}
              disabled={loading}
            >
              Buy Now - $50.00
            </Button>
          )}
        </Paper>
      </Box>

      {/* Footer */}
      <Box mt={6} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Construction Book. All rights reserved.
        </Typography>
      </Box>
      
      {/* Authentication Dialog */}
      <Dialog open={openAuthDialog} onClose={() => setOpenAuthDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {authMode === 'signin' ? 'Sign In' : 'Create Account'}
          <IconButton
            aria-label="close"
            onClick={() => setOpenAuthDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleAuthSubmit}>
          <DialogContent>
            {authMode === 'signup' && (
              <TextField
                autoFocus
                margin="dense"
                name="name"
                label="Full Name"
                type="text"
                fullWidth
                variant="outlined"
                value={authForm.name}
                onChange={handleAuthFormChange}
                required
              />
            )}
            <TextField
              margin="dense"
              name="email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={authForm.email}
              onChange={handleAuthFormChange}
              required
              autoFocus={authMode === 'signin'}
            />
            <TextField
              margin="dense"
              name="password"
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              value={authForm.password}
              onChange={handleAuthFormChange}
              required
            />
            
            {authError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {authError}
              </Alert>
            )}
            
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                {authMode === 'signin' 
                  ? "Don't have an account? " 
                  : "Already have an account? "}
                <Button 
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  color="primary"
                  size="small"
                >
                  {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                </Button>
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAuthDialog(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
          </Container>
        } />
      </Routes>
    </Router>
  )
}

export default App