const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardController');

router.get('/overview', controller.getOverview);

module.exports = router;
