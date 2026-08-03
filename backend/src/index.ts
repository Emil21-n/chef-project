const REQUIRED_PRODUCTION_SECRETS = [
  'APP_KEYS',
  'API_TOKEN_SALT',
  'ADMIN_JWT_SECRET',
  'TRANSFER_TOKEN_SALT',
  'ENCRYPTION_KEY',
] as const;

const PLACEHOLDER_PATTERN = /^(?:to-?be-?modified|change-?me|replace(?:-?me|-?with))/i;

function assertProductionConfiguration() {
  if (process.env.NODE_ENV !== 'production') return;

  const invalidSecrets = REQUIRED_PRODUCTION_SECRETS.filter((name) => {
    const value = process.env[name]?.trim() || '';
    const parts = name === 'APP_KEYS' ? value.split(',').map((part) => part.trim()) : [value];

    return parts.length < (name === 'APP_KEYS' ? 2 : 1) ||
      parts.some((part) => part.length < 16 || PLACEHOLDER_PATTERN.test(part));
  });

  if (invalidSecrets.length) {
    throw new Error(
      `Unsafe production secrets: ${invalidSecrets.join(', ')}. Configure strong independent values before startup.`
    );
  }

  if (!['postgres', 'mysql'].includes(process.env.DATABASE_CLIENT || '')) {
    throw new Error('Production Strapi requires an explicit postgres or mysql DATABASE_CLIENT.');
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register() {
    assertProductionConfiguration();
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/* { strapi }: { strapi: Core.Strapi } */) {},
};
