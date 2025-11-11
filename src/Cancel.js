import React from 'react'
import { Container, Typography, Button, Box, Paper } from '@mui/material'
import { Home as HomeIcon } from '@mui/icons-material'

function Cancel() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box textAlign="center">
          <Typography variant="h4" component="h1" color="error" gutterBottom>
            Payment Cancelled
          </Typography>
          <Typography variant="body1" paragraph>
            Your payment was cancelled. No charges were made to your account.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            If you experienced any issues during checkout, please try again or contact our support team for assistance.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<HomeIcon />}
            onClick={() => window.location.href = '/'}
            size="large"
            sx={{ mt: 2 }}
          >
            Return to Home
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

export default Cancel