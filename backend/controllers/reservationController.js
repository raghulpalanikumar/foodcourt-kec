const TableReservation = require('../models/TableReservation');

// Constants for reservation logic
const RESERVATION_DURATION = 30; // minutes
const TOTAL_TABLES = 5;
const SLOT_MS = RESERVATION_DURATION * 60 * 1000;

// Helper to get IST date/time as a Date object normalized to its physical IST time
function getISTDate() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5)); // IST is UTC + 5:30
}

// Generate slots for a specific day. 'date' is a Date object (e.g. at 00:00:00)
function getSlotStartTimesForDay(date) {
  const slots = [];
  const base = new Date(date);

  // Set to 8:00 AM in the local timezone (which we'll treat as IST)
  const start = new Date(base);
  start.setHours(8, 0, 0, 0);

  const end = new Date(base);
  end.setHours(22, 0, 0, 0);

  let current = new Date(start);
  while (current < end) {
    slots.push(new Date(current));
    current.setTime(current.getTime() + SLOT_MS);
  }
  return slots;
}

// GET available time slots for a given date (or today)
exports.getAvailableSlots = async (req, res) => {
  try {
    const requestedDate = req.query.date; // Expecting YYYY-MM-DD
    const now = new Date(); // Actual physical time

    let day;
    if (requestedDate) {
      // Create date from YYYY-MM-DD. Note: 'new Date("YYYY-MM-DD")' creates UTC midnight.
      // We want this to represent the day in local terms.
      const [y, m, d] = requestedDate.split('-').map(Number);
      day = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      day = new Date();
      day.setHours(0, 0, 0, 0);
    }

    const slotStarts = getSlotStartTimesForDay(day);
    const available = [];

    // For today, we filter past slots. We compare physical timestamps.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = day.getTime() === today.getTime();

    for (const slotStart of slotStarts) {
      if (isToday) {
        // Filter slots that started more than 15 mins ago
        if (slotStart.getTime() < now.getTime() - 15 * 60 * 1000) continue;
      } else if (day.getTime() < today.getTime()) {
        // Past day
        continue;
      }

      const slotEnd = new Date(slotStart.getTime() + SLOT_MS);
      const count = await TableReservation.countDocuments({
        slotStart: { $gte: slotStart, $lt: slotEnd }
      });

      available.push({
        slotStart: slotStart.toISOString(),
        slotEnd: slotEnd.toISOString(),
        label: slotStart.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
          // Removed hardcoded timeZone to respect server locale if it's already IST
        }),
        isFull: count >= TOTAL_TABLES,
        remainingTables: TOTAL_TABLES - count
      });
    }

    res.json({
      success: true,
      data: {
        date: requestedDate || day.toISOString().split('T')[0],
        slots: available,
        totalTables: TOTAL_TABLES,
        durationMins: RESERVATION_DURATION
      }
    });
  } catch (err) {
    console.error('getAvailableSlots error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET table availability for a specific slotStart
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
        durationMins: RESERVATION_DURATION
      }
    });
  } catch (err) {
    console.error('getTablesForSlot error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Internal: get next available slot
async function getNextAvailableSlot(baseTime) {
  let now = new Date();
  let day = new Date(baseTime);
  day.setHours(0, 0, 0, 0);

  // Check today and the next 2 days
  for (let i = 0; i < 3; i++) {
    const checkDay = new Date(day);
    checkDay.setDate(checkDay.getDate() + i);

    const slotStarts = getSlotStartTimesForDay(checkDay);

    for (const slotStart of slotStarts) {
      if (slotStart.getTime() < now.getTime()) continue;

      const slotEnd = new Date(slotStart.getTime() + SLOT_MS);
      const count = await TableReservation.countDocuments({
        slotStart: { $gte: slotStart, $lt: slotEnd }
      });

      if (count < TOTAL_TABLES) {
        return {
          nextAvailable: slotStart.toISOString(),
          label: slotStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
          isToday: i === 0
        };
      }
    }
  }

  return null;
}

// GET next available time
exports.getNextAvailableTime = async (req, res) => {
  try {
    const fromTime = req.query.from;
    let baseTime = fromTime ? new Date(fromTime) : new Date();
    const data = await getNextAvailableSlot(baseTime);
    res.json({ success: true, data });
  } catch (err) {
    console.error('getNextAvailableTime error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getNextAvailableSlot = getNextAvailableSlot;

// Create reservation (called from order flow)
exports.createReservationForOrder = async (userId, orderId, slotStart, requestedTableNumber) => {
  // Validate if table is already taken (last minute check)
  const start = new Date(slotStart);
  const slotEnd = new Date(start.getTime() + SLOT_MS);

  const isTaken = await TableReservation.exists({
    slotStart: { $gte: start, $lt: slotEnd },
    tableNumber: requestedTableNumber
  });

  if (isTaken) {
    // If specific table taken, try to auto-assign another
    const used = await TableReservation.find({ slotStart: { $gte: start, $lt: slotEnd } }, { tableNumber: 1 }).lean();
    const usedSet = new Set(used.map(u => u.tableNumber));
    let newTable = null;
    for (let t = 1; t <= TOTAL_TABLES; t++) {
      if (!usedSet.has(t)) {
        newTable = t;
        break;
      }
    }
    if (!newTable) return null; // Fully booked
    requestedTableNumber = newTable;
  }

  const reservation = await TableReservation.create({
    tableNumber: requestedTableNumber,
    slotStart: start,
    order: orderId,
    user: userId
  });
  return reservation;
};
