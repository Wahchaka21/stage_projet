const passport = require('passport')
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt')
const User = require('../schemas/userSchema')
const config = require('../config')

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt_secret,
  algorithms: ['HS256'],
  issuer: config.jwt_issuer,
  audience: config.jwt_audience,
  ignoreExpiration: false,
  clockTolerance: 5
}

passport.use(new JwtStrategy(options, async (payload, done) => {
  try {
    const userId = payload.sub || payload._id
    if (!userId) return done(null, false)

    const user = await User
      .findById(userId)
      .select('_id email role accountLocked isDeleted')
      .lean()

    if (!user) return done(null, false)

    return done(null, { ...user, iat: payload.iat })
  }
  catch (err) {
    return done(err, false)
  }
}))

module.exports = passport