const express = require('express')
require('dotenv').config()
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')
const cookieParser = require('cookie-parser')
const crypto = require('node:crypto')
const router = require('./routes')
const {
  urlNotFoundError,
  globalError,
} = require('./middlewares/errorMiddleware')
const deviceInfoMiddleware = require('./middlewares/deviceInfoMiddleware')
const { requireCSRF, verifyCSRF } = require('./middlewares/CSRFMiddleware')

// Uncaught Exception Handler
process.on('uncaughtException', (error) => {
  console.log({ name: error.name, message: error.message })
  console.log('Uncaught exception occurred! shutting down...')
  process.exit(1)
})

const app = express()
const port = process.env.PORT

// Rate Limiter
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // Limit each IP to 50 requests per `window` (here, per minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) =>
    res.status(options.statusCode).json({
      message: options.message,
    }),
})

// Middlewares
app.use(cors())
app.use(helmet())
app.use(limiter)
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(deviceInfoMiddleware)
app.use(requireCSRF)
app.use(verifyCSRF)

// API Routes
app.get('/csrf-token', (req, res) => {
  // Generate a CSRF token and store it in a cookie
  const csrfToken = crypto.randomBytes(64).toString('hex')
  res.cookie('csrfToken', csrfToken, {
    httpOnly: true,
    secure: false, // https
    sameSite: 'lax',
  })

  // Make the CSRF token available in the response locals for use in views
  res.locals.csrf = csrfToken
  res.json({
    message: 'CSRF token is set successfully',
  })
})
app.use('/api', router)

// Error Handlers
app.all('*', urlNotFoundError)
app.use(globalError)

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

// Unhandled Rejection Handler
process.on('unhandledRejection', (error) => {
  console.log({ name: error.name, message: error.message })
  console.log('Unhandled rejection occurred! shutting down...')
  if (server) {
    server.close(() => {
      process.exit(1)
    })
  } else {
    process.exit(1)
  }
})
