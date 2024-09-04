import { defineAuth, secret } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('561729478757-277sajmem59fnq638bhib9fgd5ufou8q.apps.googleusercontent.com'),
        clientSecret: secret('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'),
        scopes: ['profile', 'email'],
        attributeMapping: {
          email: 'email',
        },
      },
      callbackUrls: [
        'http://localhost:3000/profile',
        'https://main.d1r842ef96fa1l.amplifyapp.com'
      ],
      logoutUrls: ['http://localhost:3000/', 'https://main.d1r842ef96fa1l.amplifyapp.com'],
    }
  }
});
