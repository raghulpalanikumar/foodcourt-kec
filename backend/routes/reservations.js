const express = require('express');
const {
  getAvailableSlots,
  getNextAvailableTime,
  getTablesForSlot
} = require('../controllers/reservationController');

const router = express.Router();

router.get('/availability', getAvailableSlots);
router.get('/next-available', getNextAvailableTime);
router.get('/tables', getTablesForSlot);

module.exports = router;
