const idTable = require("../models/id");

async function generateId(prefix, transaction) {
  // Create entry if it doesn't exist
  const [entry] = await idTable.findOrCreate({
    where: { prefix },
    defaults: { last_number: 0 },
    transaction,
  });

  // Increment safely inside transaction
  await entry.increment("last_number", { by: 1, transaction });

  // Reload to get updated value
  await entry.reload({ transaction });

  return `${prefix}-${String(entry.last_number).padStart(6, "0")}`;
}

module.exports = generateId;