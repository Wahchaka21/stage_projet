const mongoose = require("mongoose")

function isValideObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id)
}

module.exports = { isValideObjectId }