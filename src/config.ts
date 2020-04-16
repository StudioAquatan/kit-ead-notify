import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  kit: {
    username: process.env.KIT_USERNAME as string,
    password: process.env.KIT_PASSWORD as string,
  },
  webhook: {
    lecture: process.env.DISCORD_WEBHOOK_LECTURE as string,
  },
  cookieFile: process.env.COOKIE_FILE as string,
  stateFile: {
    lecture: process.env.STATE_FILE_LECTURE as string,
  },
};
