function roomForPair(userA, userB) {
  // On convertit toujours en string pour éviter les surprises
  const a = String(userA)
  const b = String(userB)

  // Si a est "plus petit" que b on met a en premier
  if (a < b) {
    return `conv:${a}__${b}`
  } 
  // Sinon on met b en premier
  else {
    return `conv:${b}__${a}`
  }
}

module.exports = { roomForPair }