// Seed admin users for initial login (replace emails with real ones as needed)
import User from "../models/user.model.js";

const adminUsers = [
  {
    firstName: "Kyaw",
    lastName: "TK",
    email: "e1123046@u.nus.edu",
    password: "kyaw123",
    role: "admin",
  },
  {
    firstName: "Matthew",
    lastName: "Low",
    email: "mattlow1504@gmail.com",
    password: "matthew123",
    role: "admin",
  },
  {
    firstName: "Alastair",
    lastName: "Ng",
    email: "e1122690@u.nus.edu",
    password: "alastair123",
    role: "admin",
  },
  {
    firstName: "Tarsha",
    lastName: "Lim",
    email: "e1155487@u.nus.edu",
    password: "tarsha123",
    role: "admin",
  },
  {
    firstName: "Brian",
    lastName: "Chua",
    email: "E1138943@u.nus.edu",
    password: "brian123",
    role: "admin",
  },
];

console.log("Starting admin seeder...");
for (const admin of adminUsers) {
  try {
    const exists = await User.findOne({ where: { email: admin.email } });
    if (!exists) {
      await User.create(admin);
      console.log(`Created admin: ${admin.email}`);
    } else {
      console.log(`Admin already exists: ${admin.email}`);
    }
  } catch (err) {
    console.error(`Error processing ${admin.email}:`, err);
  }
}
console.log("Admin seeder finished.");

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await import("../config/database.js");
    await seedAdminUsers();
    console.log("Seeder script completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Seeder script failed:", err);
    process.exit(1);
  }
}
