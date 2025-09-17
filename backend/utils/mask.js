function maskEmail(email) {
  if (!email || typeof email !== 'string') {
    return email
  }

  const [local, domain] = email.split('@')
  if (!domain) {
    return email
  }
  
  const vis = local.slice(0, 1)
  return `${vis}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`
}

module.exports = { maskEmail }