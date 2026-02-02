const RESERVATION_DURATION_MINS = 30;
const SLOT_MS = RESERVATION_DURATION_MINS * 60 * 1000;

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

const day = new Date();
day.setHours(0, 0, 0, 0);
console.log('Day:', day.toISOString());

const slotStarts = getSlotStartTimesForDay(day);
const now = new Date();
console.log('Now:', now.toISOString());
console.log('Total slots defined:', slotStarts.length);

const available = [];
for (const slotStart of slotStarts) {
    const isPast = slotStart < now;
    if (!isPast) {
        available.push(slotStart.toISOString());
    }
}

console.log('Future slots:', available.length);
if (available.length > 0) {
    console.log('First available:', available[0]);
    console.log('Last available:', available[available.length - 1]);
}
