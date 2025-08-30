function persoError(type, message, options = {}) {
    const error = { type, message }

    if (options.fields) {
        error.fields = options.fields
    }

    if (options.original) {
        error.original = options.original
    }

    return error
}

module.exports = persoError