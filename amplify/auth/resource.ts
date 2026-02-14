import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      otpLogin: true // Enable email OTP
    }
  }
  // senders: {
  //   email: {
  //     fromEmail: "registrations@37-studio.com",
  //     fromName: "Dreamlog",
  //     replyTo: "li-chi@37-studio.com"
  //   },
  // },
});
