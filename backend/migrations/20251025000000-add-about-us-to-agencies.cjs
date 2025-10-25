"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("agencies", "aboutUs", {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Agency description/bio",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("agencies", "aboutUs");
  },
};
