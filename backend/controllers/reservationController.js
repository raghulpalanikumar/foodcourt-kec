const TableReservation = require('../models/TableReservation');
const { RESERVATION_DURATION_MINS, TOTAL_TABLES } = require('../models/TableReservation');

// Slot duration in ms
const SLOT_MS = RESERVATION_DURATION_MINS * 60 * 1000;

// Get opening hours (e.g. 8 AM to 10 PM) - generate slots in 30-min steps
function getSlotStartTimesForDay(date) {
  const slots = [];
  const d = new Date(date);
  d.setHours(8, 0, 0, 0);
  const end = new Date(date);
  end.setHours(22, 0, 0, 0);
  while (d < end) {
    slots.push(new Date(d));
    d.setTime(d.getTime() + SLOT_MS);
  }
  return slots;
}

// GET available time slots for a given date (or today)
exports.getAvailableSlots = async (req, res) => {
  try {
    // Hackathon rule: reservations are ONLY for today
    const day = new Date();
    day.setHours(0, 0, 0, 0);

    const slotStarts = getSlotStartTimesForDay(day);
    const now = new Date();

    const available = [];
    for (const slotStart of slotStarts) {
      if (slotStart < now) continue; // past
      const slotEnd = new Date(slotStart.getTime() + SLOT_MS);
      const count = await TableReservation.countDocuments({
        slotStart: { $gte: slotStart, $lt: slotEnd }
      });
      if (count < TOTAL_TABLES) {
        available.push({
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
          label: slotStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        });
      }
    }

    res.json({
      success: true,
      data: {
        date: day.toISOString().split('T')[0],
        slots: available,
        totalTables: TOTAL_TABLES,
        durationMins: RESERVATION_DURATION_MINS
      }
    });
  } catch (err) {
    console.error('getAvailableSlots error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET table availability for a specific slotStart (today only)
exports.getTablesForSlot = async (req, res) => {
  try {
    const slotStartRaw = req.query.slotStart;
    if (!slotStartRaw) {
      return res.status(400).json({ success: false, message: 'slotStart is required' });
    }

    const slotStart = new Date(slotStartRaw);
    if (isNaN(slotStart.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid slotStart' });
    }

    // Today-only enforcement
    const today = new Date();
    const startDay = new Date(slotStart);
    today.setHours(0, 0, 0, 0);
    startDay.setHours(0, 0, 0, 0);
    if (startDay.getTime() !== today.getTime()) {
      return res.status(400).json({ success: false, message: 'Reservations are available only for today' });
    }

    const now = new Date();
    if (slotStart < now) {
      return res.status(400).json({ success: false, message: 'Cannot reserve a past time' });
    }

    const slotEnd = new Date(slotStart.getTime() + SLOT_MS);
    const used = await TableReservation.find(
      { slotStart: { $gte: slotStart, $lt: slotEnd } },
      { tableNumber: 1 }
    ).lean();
    const takenTables = used.map((r) => r.tableNumber).sort((a, b) => a - b);
    const takenSet = new Set(takenTables);
    const availableTables = [];
    for (let t = 1; t <= TOTAL_TABLES; t++) {
      if (!takenSet.has(t)) availableTables.push(t);
    }

    res.json({
      success: true,
      data: {
        slotStart: slotStart.toISOString(),
        slotEnd: slotEnd.toISOString(),
        availableTables,
        takenTables,
        totalTables: TOTAL_TABLES,
        durationMins: RESERVATION_DURATION_MINS
      }
    });
  } catch (err) {
    console.error('getTablesForSlot error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Internal: get next available slot (for use in order validation)
async function getNextAvailableSlot(fromTime) {
  let day = fromTime ? new Date(fromTime) : new Date();
  if (day < new Date()) day = new Date();
  day.setSeconds(0, 0);
  const slotStarts = getSlotStartTimesForDay(day);
  const now = new Date();
  for (const slotStart of slotStarts) {
    if (slotStart < now) continue;
    const slotEnd = new Date(slotStart.getTime() + SLOT_MS);
    const count = await TableReservation.countDocuments({
      slotStart: { $gte: slotStart, $lt: slotEnd }
    });
    if (count < TOTAL_TABLES) {
      return {
        nextAvailable: slotStart.toISOString(),
        label: slotStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
    }
  }
  const tomorrow = new Date(day);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  return {
    nextAvailable: tomorrow.toISOString(),
    label: tomorrow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    nextDay: true
  };
}

// GET next available time when all tables are full (for "tables available after X" message)
exports.getNextAvailableTime = async (req, res) => {
  try {
    const fromTime = req.query.from;
    // Today-only enforcement (but we can still give next available slot today)
    let day = new Date();
    day.setHours(0, 0, 0, 0);
    if (fromTime) {
      const from = new Date(fromTime);
      if (from > day) day = from;
    }
    const data = await getNextAvailableSlot(day);
    res.json({ success: true, data });
  } catch (err) {
    console.error('getNextAvailableTime error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getNextAvailableSlot = getNextAvailableSlot;

// Check if a specific slot is still available (for validation before order)
exports.isSlotAvailable = async (slotStart) => {
  const start = new Date(slotStart);
  const slotEnd = new Date(start.getTime() + SLOT_MS);
  const count = await TableReservation.countDocuments({
    slotStart: { $gte: start, $lt: slotEnd }
  });
  return count < TOTAL_TABLES;
};

// Assign table number for a slot (1-5, first free)
exports.assignTableForSlot = async (slotStart) => {
  const start = new Date(slotStart);
  const slotEnd = new Date(start.getTime() + SLOT_MS);
  const used = await TableReservation.find(
    { slotStart: { $gte: start, $lt: slotEnd } },
    { tableNumber: 1 }
  ).lean();
  const usedSet = new Set(used.map((r) => r.tableNumber));
  for (let t = 1; t <= TOTAL_TABLES; t++) {
    if (!usedSet.has(t)) return t;
  }
  return null;
};

exports.isTableAvailableForSlot = async (tableNumber, slotStart) => {
  const start = new Date(slotStart);
  const slotEnd = new Date(start.getTime() + SLOT_MS);
  const exists = await TableReservation.exists({
    tableNumber,
    slotStart: { $gte: start, $lt: slotEnd }
  });
  return !exists;
};

// Create reservation (called from order controller after order is created)
exports.createReservationForOrder = async (userId, orderId, slotStart, requestedTableNumber) => {
  const tableNumber = requestedTableNumber || await exports.assignTableForSlot(slotStart);
  if (tableNumber == null) return null;
  const reservation = await TableReservation.create({
    tableNumber,
    slotStart: new Date(slotStart),
    order: orderId,
    user: userId
  });
  return reservation;
};
