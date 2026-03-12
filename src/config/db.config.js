const { Sequelize } = require("sequelize");
const path = require("path");
require("dotenv").config();

let sequelize;

if (process.env.DB_TYPE === "mysql") {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: "mysql",
      logging: process.env.NODE_ENV === "development" ? console.log : false,
    }
  );

  console.log("Using MySQL Database");

} else {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.join(__dirname, "../../data/database.db"),
    logging: process.env.NODE_ENV === "development" ? console.log : false,
  });

  console.log("Using SQLite Database");
}

module.exports = sequelize;