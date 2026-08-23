const express = require("express");
const router = express.Router();
const DisposeController = require("../controllers/DisposeController.js");
const verifyToken = require('../middlewares/Authmiddleware.js');

router.post("/createreleaserecord", verifyToken, DisposeController.createreleaserecord);
router.put("/updateqty/:id", verifyToken, DisposeController.updateqty);
router.get("/view/returned", verifyToken, DisposeController.viewreturnedchemicals);
router.get("/view/notreturned", verifyToken, DisposeController.viewnotreturnedchemicals);
router.get("/getformdata", verifyToken, DisposeController.getformdata);
router.get("/getbatchbychemicalid/:chemicalId", verifyToken, DisposeController.getbatchbychemicalid);
module.exports = router;
