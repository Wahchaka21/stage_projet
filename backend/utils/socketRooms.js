function roomForPair(userA, userB) {
    const a = String(userA)
    const b = String(userB)
    return a<b ? `conv:${a}__${b}` : `conv:${b}__${a}`
}

module.exports = { roomForPair }