const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/permissions', requirePermission('roles.manage'), userController.getPermissions);
router.get('/roles', requirePermission('users.view'), userController.listRoles);
router.post('/roles', requirePermission('roles.manage'), userController.createRole);
router.put('/roles/:roleId', requirePermission('roles.manage'), userController.updateRole);

router.get('/', requirePermission('users.view'), userController.listUsers);
router.post('/', requirePermission('users.manage'), userController.createUser);
router.put('/:userId', requirePermission('users.manage'), userController.updateUser);

module.exports = router;
