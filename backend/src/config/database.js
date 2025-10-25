import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Custom logging function for cleaner SQL logs
const customLogger = (sql, timing) => {
  if (process.env.NODE_ENV !== "development") return;

  // Extract the main operation from the SQL
  let operation = "UNKNOWN";
  if (sql.includes("SELECT")) operation = "SELECT";
  else if (sql.includes("INSERT")) operation = "INSERT";
  else if (sql.includes("UPDATE")) operation = "UPDATE";
  else if (sql.includes("DELETE")) operation = "DELETE";

  // Extract table name
  let tableName = "unknown";
  const tableMatches =
    sql.match(/FROM "([^"]+)"/i) ||
    sql.match(/INTO "([^"]+)"/i) ||
    sql.match(/UPDATE "([^"]+)"/i);
  if (tableMatches) {
    tableName = tableMatches[1];
  }

  // Extract WHERE conditions (simplified)
  let whereClause = "";
  const whereMatch = sql.match(/WHERE (.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/i);
  if (whereMatch) {
    whereClause = whereMatch[1].substring(0, 100); // Limit length
    if (whereMatch[1].length > 100) whereClause += "...";
  }

  // Log in a cleaner format
  console.log(
    `🗄️  ${operation} ${tableName}${
      whereClause ? ` WHERE ${whereClause}` : ""
    }${timing ? ` (${timing}ms)` : ""}`
  );
};

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? customLogger : false,
});

export default sequelize;
