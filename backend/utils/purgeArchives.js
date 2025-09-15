const UserDeletionArchive = require("../schemas/userDeletetionArchive")

async function purgeExpiredUserDeletionArchives() {
  const now = new Date()
  const res = await UserDeletionArchive.deleteMany({ keptUntil: { $lte: now } })
  if (res?.deletedCount) {
    console.info(`[ARCHIVE_PURGE] ${res.deletedCount} archives supprimées`)
  }
}

function startArchivePurgeJob() {
  // toutes les 12h (ajuste si tu veux)
  const TWELVE_HOURS = 12 * 60 * 60 * 1000
  setInterval(() => {
    purgeExpiredUserDeletionArchives().catch(err => {
      console.error('[ARCHIVE_PURGE_ERROR]', err?.message || err)
    })
  }, TWELVE_HOURS)
}

module.exports = { startArchivePurgeJob }