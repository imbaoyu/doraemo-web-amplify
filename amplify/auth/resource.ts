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
        clientId: secret('google-client-id'),
        clientSecret: secret('google-client-secret'),
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
