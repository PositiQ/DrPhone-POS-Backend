const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");

router.get("/summary", supplierController.getSuppliersSummary);
router.get("/cheques", supplierController.getSupplierCheques);
router.patch("/cheques/:cheque_id/status", supplierController.updateSupplierChequeStatus);
router.post("/purchases", supplierController.createSupplierPurchase);
router.post("/payments", supplierController.createSupplierPayment);

router.get("/", supplierController.getSuppliers);
router.post("/", supplierController.createSupplier);
router.get("/:id", supplierController.getSupplierById);
router.put("/:id", supplierController.updateSupplier);

module.exports = router;
