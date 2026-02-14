import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
       // 或 "LINK"
        verificationEmailSubject: "歡迎來到夢域誌 DreamLog",
        verificationEmailBody: (createCode: () => string) => `您的驗證碼是：${createCode()}`,
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
