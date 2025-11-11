// Payment helper functions for Stripe Connect
// IMPORTANT: This webapp will be deployed to its own URL (e.g., Netlify)
// But it needs to call back to the platform's API for payment processing
// PLATFORM_URL = Platform API endpoint (where payment APIs are hosted)
const PLATFORM_URL = 'http://localhost:3000'  // Platform API endpoint

/**
 * Detect if running in Sandpack preview (BuiltByMe platform)
 * If so, redirects should go back to the platform, not the Sandpack URL
 */
function getRedirectBaseUrl() {
  // Check if running in Sandpack preview (BuiltByMe platform)
  const isSandpackPreview = false;
  
  if (isSandpackPreview) {
    // Running in BuiltByMe platform preview - redirect back to platform
    return PLATFORM_URL
  } else {
    // Running in deployed webapp - use the webapp's own URL
    return window.location.origin
  }
}

export const paymentHelpers = {
  /**
   * Get all available products for this webapp
   * Calls the platform's API to fetch products
   */
  async getProducts() {
    const response = await fetch(`${PLATFORM_URL}/api/webapps/6912c35040c9afb8d9df2b75/payments/storefront`)
    if (!response.ok) throw new Error('Failed to fetch products')
    const data = await response.json()
    return data.products || []
  },

  /**
   * Create a checkout session for a product
   * Calls the platform's API to create a Stripe checkout session
   * @param {string} priceId - Stripe price ID
   * @param {number} quantity - Quantity to purchase (default: 1)
   * @param {'payment' | 'subscription'} mode - Payment mode (default: 'payment')
   * @param {string} successUrl - URL to redirect after successful payment (defaults to platform URL if in preview, or deployed webapp URL)
   * @param {string} cancelUrl - URL to redirect if payment is cancelled (defaults to platform URL if in preview, or deployed webapp URL)
   * @param {string} customerEmail - Customer email (required for subscriptions to link to Supabase user)
   */
  async createCheckout(priceId, quantity = 1, mode = 'payment', successUrl, cancelUrl, customerEmail) {
    // Determine redirect base URL (platform if in preview, webapp URL if deployed)
    const redirectBase = getRedirectBaseUrl()
    
    // For subscriptions, customerEmail is required (from authenticated Supabase user)
    const body = {
      priceId,
      quantity,
      mode,
      // Use platform URL if in preview, or deployed webapp URL if deployed
      successUrl: successUrl || `${redirectBase}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: cancelUrl || `${redirectBase}/cancel`
    }
    
    // Add customer email for subscriptions
    if (mode === 'subscription' && customerEmail) {
      body.customerEmail = customerEmail
    }
    
    // Call platform API to create checkout
    const response = await fetch(`${PLATFORM_URL}/api/webapps/6912c35040c9afb8d9df2b75/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create checkout')
    }
    
    const data = await response.json()
    return data
  },

  /**
   * Redirect to Stripe Checkout
   * @param {string} priceId - Stripe price ID
   * @param {object} options - Additional options (quantity, mode, successUrl, cancelUrl, customerEmail)
   */
  async redirectToCheckout(priceId, options = {}) {
    const checkout = await this.createCheckout(
      priceId,
      options.quantity,
      options.mode || 'payment',
      options.successUrl,
      options.cancelUrl,
      options.customerEmail
    )
    
    if (checkout.url) {
      // Stripe Checkout cannot run in an iframe - detect and open in new tab if needed
      if (window.self !== window.top) {
        // Running in an iframe (e.g., Sandpack preview) - open in new tab
        window.open(checkout.url, '_blank')
      } else {
        // Running in top-level window - normal redirect
      window.location.href = checkout.url
      }
    } else {
      throw new Error('No checkout URL returned')
    }
  },

  /**
   * Verify if user has purchased a product
   * Supports TWO authentication methods:
   * 1. Auth token (for authenticated users) - pass authToken
   * 2. Checkout session ID (for guest purchases) - pass checkoutSessionId
   * 
   * @param {string} productId - Stripe product ID
   * @param {string} authToken - (Optional) User's authentication token from webapp session
   * @param {string} checkoutSessionId - (Optional) Stripe checkout session ID from success page URL
   * @returns {Promise<{hasPurchased: boolean, purchaseDate?: string}>}
   */
  async verifyPurchase(productId, authToken = null, checkoutSessionId = null) {
    // Build URL with query params
    const url = new URL(`${PLATFORM_URL}/api/webapps/6912c35040c9afb8d9df2b75/payments/verify`)
    url.searchParams.set('product_id', productId)
    if (checkoutSessionId) {
      url.searchParams.set('checkout_session_id', checkoutSessionId)
    }

    // Build headers
    const headers = {}
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(url.toString(), { headers })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to verify purchase')
    }

    return await response.json()
  },

  /**
   * Download a purchased product's digital asset
   * Supports TWO authentication methods:
   * 1. Auth token (for authenticated users) - pass authToken
   * 2. Checkout session ID (for guest purchases) - pass checkoutSessionId
   * 
   * NOTE: Guest purchases can download immediately after purchase using checkout_session_id.
   * Session-based access expires after 24 hours (encourages sign-up for permanent access).
   * 
   * @param {string} productId - Stripe product ID
   * @param {string} authToken - (Optional) User's authentication token from webapp session
   * @param {string} checkoutSessionId - (Optional) Stripe checkout session ID from success page URL
   * @returns {Promise<void>}
   */
  async downloadProduct(productId, authToken = null, checkoutSessionId = null) {
    // First verify purchase
    const verification = await this.verifyPurchase(productId, authToken, checkoutSessionId)
    
    if (!verification.hasPurchased) {
      throw new Error('You have not purchased this product')
    }

    // Build download URL with query params
    const url = new URL(`${PLATFORM_URL}/api/webapps/6912c35040c9afb8d9df2b75/payments/download`)
    url.searchParams.set('product_id', productId)
    if (checkoutSessionId) {
      url.searchParams.set('checkout_session_id', checkoutSessionId)
    }

    // Build headers
    const headers = {}
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    // Download file
    const downloadResponse = await fetch(url.toString(), { headers })

    if (!downloadResponse.ok) {
      const error = await downloadResponse.json().catch(() => ({ error: 'Failed to download' }))
      throw new Error(error.error || 'Failed to download file')
    }

    // Get filename from Content-Disposition header or use product ID
    const contentDisposition = downloadResponse.headers.get('Content-Disposition')
    let fileName = `product-${productId}.pdf`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match) fileName = match[1]
    }

    // Create blob and trigger download
    const blob = await downloadResponse.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(blobUrl)
    document.body.removeChild(a)
  },

  /**
   * Get all products the authenticated user has purchased
   * @param {string} authToken - User's authentication token from webapp session
   * @returns {Promise<Array<{productId: string, productName: string, purchaseDate: string, amount: number, currency: string}>>}
   */
  async getMyPurchases(authToken) {
    // Get all products first
    const products = await this.getProducts()
    
    // Check which ones the user has purchased
    const purchases = []
    for (const product of products) {
      try {
        const verification = await this.verifyPurchase(product.id, authToken)
        if (verification.hasPurchased) {
          purchases.push({
            productId: product.id,
            productName: product.name,
            purchaseDate: verification.purchaseDate,
            amount: verification.amount || 0,
            currency: verification.currency || 'usd'
          })
        }
      } catch (error) {
        // Skip products that user hasn't purchased
        console.log(`User hasn't purchased ${product.name}:`, error.message)
      }
    }
    
    return purchases
  }
}