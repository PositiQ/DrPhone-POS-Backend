const express = require('express');
const router = express.Router();
const controller = require('../controllers/resetController');

router.get('/groups', controller.getResetGroups);
router.post('/selective', controller.resetSelective);
router.post('/full', controller.resetFull);

module.exports = router;
