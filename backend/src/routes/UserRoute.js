const UserController = require("../controllers/UserController");
const verifyToken = require("../middlewares/Authmiddleware");
const express = require("express");
const router = express.Router();

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden: You do not have permission to perform this action." });
    }
    next();
  };
};

router.post("/register", verifyToken, authorizeRoles("ADMIN"), UserController.createUser);
router.post("/login", UserController.loginUser);
router.post("/reset-password", verifyToken, authorizeRoles("ADMIN", "LECTURER"), UserController.changePassword);
router.get("/viewusers", verifyToken, authorizeRoles("ADMIN"), UserController.viewUsers);
router.delete("/deleteuser/:id", verifyToken, authorizeRoles("ADMIN"), UserController.deleteUser);

module.exports = router;
