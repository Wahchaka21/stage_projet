const config = {
  mongo_url: process.env.MONGO_URL || 'mongodb://localhost:27017/projet_stage',
  jwt_secret: process.env.JWT_SECRET,
  jwt_issuer: process.env.JWT_ISSUER || 'your-app',
  jwt_audience: process.env.JWT_AUDIENCE || 'your-api',
  port: process.env.PORT || 3000
}

if (!config.jwt_secret) {
  throw new Error(
    'JWT_SECRET is not set.'
  )
}

module.exports = config