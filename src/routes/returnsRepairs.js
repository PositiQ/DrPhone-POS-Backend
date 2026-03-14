const express = require("express");
const router = express.Router();
const controller = require("../controllers/returnRepairController");

router.get("/statuses", controller.getStatusOptions);
router.get("/summary", controller.getSummary);
router.get("/unusable-returns", controller.getUnusableReturns);
router.get("/", controller.getTickets);
router.post("/", controller.createTicket);
router.patch("/:id", controller.updateTicket);
router.patch("/:id/status", controller.updateTicketStatus);

module.exports = router;
