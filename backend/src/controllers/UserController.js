const { User } = require("../models/index.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { logAction } = require("../services/auditLogService.js");
const { createNotification } = require("../services/notificationService.js");

const createUser = async (req, res) => {
  try {
    const { institutionalId, fullName, email, password, role } = req.body;
    if (!institutionalId || !fullName || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const institutionalIdRegex = /^R\d{6}$/;
    if (!institutionalIdRegex.test(institutionalId)) {
      return res.status(400).json({
        error:
          "Institutional ID must be in the format R123456 (capital R followed by 6 digits).",
      });
    }
    const existingUser = await User.findOne({
      where: {
        institutionalId,
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this institutional ID already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      institutionalId,
      fullName,
      email,
      passwordHash,
      role,
    });

    // --- Notification: New User Added ---
    // The user performing the action is the 'actor'
    const actor = { id: req.user.id, fullName: req.user.fullName };
    // The user being created is the 'entity'
    const entity = user;

    await createNotification({
      actor,
      entity,
      entityType: 'User',
      type: 'NEW_USER_ADDED',
      severity: 'INFO',
      messageBuilder: {
        // Message for the person who performed the action
        actor: (e) => `You have added a new user: ${e.fullName} (${e.role}).`,
        // Message for everyone else
        others: (actorName, e) => `${actorName} has added a new user: ${e.fullName} (${e.role}).`,
      },
    });

    // Audit Log: User Creation
    // We assume an admin is performing this action and is available in req.user
    if (req.user && req.user.id !== user.id) {
      await logAction({
        userId: req.user.id,
        userName: req.user.fullName,
        actionType: "CREATE_USER",
        entityType: "User",
        entityId: user.id,
        details: {
          createdUser: {
            institutionalId: user.institutionalId,
            fullName: user.fullName,
            role: user.role,
          },
        },
        ipAddress: req.ip,
      });
    }
    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    let { institutionalId, password } = req.body;
    if (!institutionalId || !password) {
      return res.status(400).json({ error: "Both fields are required" });
    }
    institutionalId = institutionalId.toUpperCase();
    const user = await User.findOne({
      where: {
        institutionalId,
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "User account is deleted" });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Audit Log: Failed Login Attempt
      await logAction({
        userId: user.id,
        userName: user.fullName,
        actionType: "LOGIN_FAILURE",
        details: { reason: "Invalid credentials" },
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      {
        id: user.id,
        institutionalId: user.institutionalId,
        fullName: user.fullName,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    user.lastLoginAt = new Date();
    await user.save();

    // Audit Log: Successful Login
    await logAction({
      userId: user.id,
      userName: user.fullName,
      actionType: "LOGIN_SUCCESS",
      entityType: "User",
      entityId: user.id,
      ipAddress: req.ip,
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords are required" });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters long" });
    }
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;
    await user.save();

    // Audit Log: Password Change
    await logAction({
      userId: user.id,
      userName: user.fullName,
      actionType: "CHANGE_PASSWORD",
      entityType: "User",
      entityId: user.id,
      ipAddress: req.ip,
    });
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const viewUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "institutionalId",
        "fullName",
        "email",
        "role",
        "isActive",
        "lastLoginAt",
      ],
    });
    res.json(users);
  } catch (error) {
    console.error("Error viewing users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const adminId = req.user.id;

    if (!password) {
      return res
        .status(400)
        .json({ error: "Password is required to confirm deletion" });
    }

    const adminUser = await User.findByPk(adminId);
    if (!adminUser) {
      return res.status(404).json({ error: "Admin user not found" });
    }

    const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ error: "Incorrect password. Deletion failed." });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role === "ADMIN" || user.role === "TECHNICAL_OFFICER") {
      // Audit Log: Deactivate User
      await logAction({
        userId: adminUser.id,
        userName: adminUser.fullName,
        actionType: "DEACTIVATE_USER",
        entityType: "User",
        entityId: user.id,
        details: { targetUser: { institutionalId: user.institutionalId, fullName: user.fullName } },
        ipAddress: req.ip,
      });
      await user.update({ isActive: false });
      return res.json({ message: `${user.role} deactivated successfully` });
    }

    // Store details before destroying for the log
    const deletedUserDetails = { institutionalId: user.institutionalId, fullName: user.fullName };

    await user.destroy();

    // Audit Log: Delete User
    await logAction({
      userId: adminUser.id,
      userName: adminUser.fullName,
      actionType: "DELETE_USER",
      entityType: "User",
      entityId: id, // user object is gone, use the id from params
      details: { deletedUser: deletedUserDetails },
      ipAddress: req.ip,
    });

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
module.exports = {
  createUser,
  loginUser,
  changePassword,
  viewUsers,
  deleteUser,
};
