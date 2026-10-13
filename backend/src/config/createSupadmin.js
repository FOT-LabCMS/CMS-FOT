const bcrypt = require("bcrypt");
const sequelize = require("./config/database");
const User = require("../models/User")(sequelize);

async function createSuperAdmin() {
  try {
    await sequelize.authenticate();

    const existingUser = await User.findOne({
      where: {
        institutionalId: "sup0001",
      },
    });

    if (existingUser) {
      console.log("Super Admin already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash("cms03201114@", 12);

    await User.create({
      institutionalId: "sup0001",
      fullName: "Super Admin",
      email: "superadmin@tec.ruh.ac.lk",
      passwordHash,
      role: "SUPERADMIN",
      authSource: "LOCAL",
      isActive: true,
    });

    console.log("Super Admin created successfully.");
  } catch (error) {
    console.error("Failed to create Super Admin:", error);
  } finally {
    await sequelize.close();
  }
}

createSuperAdmin();
