import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { paymentHelpers } from './lib/payments'
import { 
  Container, 
  Typography, 
  Button, 
  Box,
  Paper,
  CircularProgress,
  Divider,
  Alert
} from '@mui/material'
import { Download as DownloadIcon, Home as HomeIcon } from '@mui/icons-material'

function Success() {
  // Get session_id from URL
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id') // Stripe checkout session ID
  
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'))
  const [products, setProducts] = useState([])

  useEffect(() => {
    // Load products to show what was purchased
    paymentHelpers.getProducts()
      .then(products => {
        setProducts(products)
        
        // If user is authenticated, load their purchases
        if (authToken) {
          paymentHelpers.getMyPurchases(authToken)
            .then(setPurchases)
            .catch(err => {
              console.error('Error fetching purchases:', err)
              setError('Failed to load your purchases. Please try again.')
            })
            .finally(() => setLoading(false))
        } else {
          // For guest purchases, verify purchase using session ID
          const productId = 'prod_TOxfTJThUzdap9' // Construction Book product ID
          
          if (productId && sessionId) {
            // Verify purchase using checkout session ID (works for guests!)
            paymentHelpers.verifyPurchase(productId, null, sessionId)
              .then(verification => {
                if (verification.hasPurchased) {
                  // Create a purchase object for display
                  const product = products.find(p => p.id === productId)
                  if (product) {
                    setPurchases([{
                      productId: product.id,
                      productName: product.name || 'Construction Book',
                      purchaseDate: verification.purchaseDate || new Date().toISOString(),
                      amount: verification.amount || 5000,
                      currency: verification.currency || 'usd',
                      isGuestPurchase: true // Flag to indicate guest purchase
                    }])
                  }
                }
              })
              .catch(err => {
                console.error('Error verifying purchase:', err)
                setError('Failed to verify your purchase. Please contact support.')
              })
              .finally(() => setLoading(false))
          } else {
            setLoading(false)
          }
        }
      })
      .catch(err => {
        console.error('Error fetching products:', err)
        setError('Failed to load products. Please try again.')
        setLoading(false)
      })
  }, [authToken, sessionId])

  const handleDownload = async (productId, isGuestPurchase = false) => {
    try {
      if (isGuestPurchase && sessionId) {
        // Guest purchase: use checkout session ID (works immediately, no sign-up required!)
        await paymentHelpers.downloadProduct(productId, null, sessionId)
      } else if (authToken) {
        // Authenticated user: use auth token
        await paymentHelpers.downloadProduct(productId, authToken)
      } else {
        setError('Please sign in to download, or use the checkout session link')
      }
    } catch (err) {
      console.error('Download error:', err)
      setError(err.message || 'Failed to download')
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" component="h1" color="primary" gutterBottom>
            Payment Successful!
          </Typography>
          <Typography variant="body1">
            Thank you for your purchase. Your payment has been processed successfully.
          </Typography>
          
          {sessionId && (
            <Typography variant="body2" color="text.secondary" mt={1}>
              Order ID: {sessionId.substring(0, 16)}...
            </Typography>
          )}
        </Box>
        
        {/* Show message for guest purchases */}
        {!authToken && sessionId && (
          <Alert severity="info" sx={{ mb: 4 }}>
            <Typography variant="body2">
              <strong>Guest Purchase:</strong> You can download immediately below. 
              For permanent access, consider signing up (downloads expire after 24 hours for guests).
            </Typography>
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        
        {/* Show purchased products with download buttons */}
        <Box mt={4}>
          <Typography variant="h5" gutterBottom>
            Your Purchases
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" mt={2}>
                Loading your purchases...
              </Typography>
            </Box>
          ) : purchases.length > 0 ? (
            <Box>
              {purchases.map(purchase => (
                <Paper key={purchase.productId} variant="outlined" sx={{ p: 3, mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                    <Box>
                      <Typography variant="h6">{purchase.productName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Purchased: {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </Typography>
                      {purchase.isGuestPurchase && (
                        <Typography variant="body2" color="warning.main" mt={1}>
                          Guest purchase - download expires in 24 hours
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(purchase.productId, purchase.isGuestPurchase)}
                      sx={{ mt: { xs: 2, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
                    >
                      Download
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No purchases found. If you just completed a purchase, it may take a moment to process.
              </Typography>
            </Box>
          )}
        </Box>
        
        <Box mt={6} textAlign="center">
          <Button 
            variant="outlined"
            color="primary"
            startIcon={<HomeIcon />}
            onClick={() => window.location.href = '/'}
            size="large"
          >
            Return to Home
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

export default Success