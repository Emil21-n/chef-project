const REQUIRED_PRODUCTION_SECRETS = [
  'APP_KEYS',
  'API_TOKEN_SALT',
  'ADMIN_JWT_SECRET',
  'TRANSFER_TOKEN_SALT',
] as const;
const OPTIONAL_PRODUCTION_SECRETS = ['ENCRYPTION_KEY'] as const;

const PLACEHOLDER_PATTERN = /^(?:to-?be-?modified|change-?me|replace(?:-?me|-?with))/i;

function assertProductionConfiguration() {
  if (process.env.NODE_ENV !== 'production') return;

  const invalidSecrets = [
    ...REQUIRED_PRODUCTION_SECRETS,
    ...OPTIONAL_PRODUCTION_SECRETS,
  ].filter((name) => {
    const value = process.env[name]?.trim() || '';
    const required = REQUIRED_PRODUCTION_SECRETS.includes(
      name as (typeof REQUIRED_PRODUCTION_SECRETS)[number]
    );

    if (!value) return required;

    const parts = name === 'APP_KEYS'
      ? value
        .replace(/^\s*\[/, '')
        .replace(/\]\s*$/, '')
        .split(',')
        .map((part) => part.trim().replace(/^["']|["']$/g, ''))
      : [value];

    return parts.some((part) => !part || PLACEHOLDER_PATTERN.test(part));
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
