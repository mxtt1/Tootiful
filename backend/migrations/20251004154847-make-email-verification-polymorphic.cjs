'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1) Drop FK (if it exists) so we can store agency IDs too
    //    If your constraint name differs, this try/catch safely ignores the error.
    try {
      await queryInterface.removeConstraint(
        'email_verification_tokens',
        'email_verification_tokens_user_id_fkey'
      );
    } catch (e) {
      // ignore if not present
    }

    // 2) Add polymorphic discriminator: account_type
    await queryInterface.addColumn('email_verification_tokens', 'account_type', {
      type: Sequelize.STRING(16),            // 'user' | 'agency'
      allowNull: false,
      defaultValue: 'user',
    });

    // 3) (Optional) Add resend counter to help rate-limit resend
    try {
      await queryInterface.addColumn('email_verification_tokens', 'resent_count', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    } catch (e) {
      // column already exists
    }

    // 4) (Optional safety) Add token_hash if your table doesn’t already have it
    //    If you already store a hash under a different column, you can delete this block.
    try {
      await queryInterface.addColumn('email_verification_tokens', 'token_hash', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    } catch (e) {
      // column already exists
    }

    // 5) Helpful index for quick lookups
    await queryInterface.addIndex(
      'email_verification_tokens',
      ['user_id', 'account_type'],
      { name: 'evt_userid_accounttype_idx' }
    );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('email_verification_tokens', 'evt_userid_accounttype_idx').catch(() => {});
    await queryInterface.removeColumn('email_verification_tokens', 'token_hash').catch(() => {});
    await queryInterface.removeColumn('email_verification_tokens', 'resent_count').catch(() => {});
    await queryInterface.removeColumn('email_verification_tokens', 'account_type').catch(() => {});

    // (Optional) Recreate the old FK if you really want to roll back to user-only
    // await queryInterface.addConstraint('email_verification_tokens', {
    //   fields: ['user_id'],
    //   type: 'foreign key',
    //   name: 'email_verification_tokens_user_id_fkey',
    //   references: { table: 'users', field: 'id' },
    //   onUpdate: 'CASCADE',
    //   onDelete: 'NO ACTION',
    // });
  }
};
