import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      otpLogin: true
    }
  },
  userAttributes: {
    "custom:interest": {
      dataType: "String",
      mutable: true,
      minLen: 0,
      maxLen: 256,
    },
    "custom:expertise": {
      dataType: "String",
      mutable: true,
      minLen: 0,
      maxLen: 256,
    },
    "custom:personality": {
      dataType: "String",
      mutable: true,
      minLen: 0,
      maxLen: 256,
    },
  }
});
