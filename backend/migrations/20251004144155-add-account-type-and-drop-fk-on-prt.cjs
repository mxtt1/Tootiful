'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // A) Drop FK so we can store agency IDs
    await queryInterface.removeConstraint(
      'password_reset_tokens',
      'password_reset_tokens_user_id_fkey'
    );

    // B) Add polymorphic discriminator
    await queryInterface.addColumn('password_reset_tokens', 'account_type', {
      type: Sequelize.STRING(16),   // 'user' | 'agency'
      allowNull: false,
      defaultValue: 'user',
    });

    // C) Speed up lookups by (user_id, account_type)
    await queryInterface.addIndex(
      'password_reset_tokens',
      ['user_id', 'account_type'],
      { name: 'prt_userid_accounttype_idx' }
    );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('password_reset_tokens', 'prt_userid_accounttype_idx');
    await queryInterface.removeColumn('password_reset_tokens', 'account_type');

    // (Optional) Recreate FK if you ever roll back the polymorphic design
    await queryInterface.addConstraint('password_reset_tokens', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'password_reset_tokens_user_id_fkey',
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION',
    });
  }
};
