import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  kit: {
    username: process.env.KIT_USERNAME as string,
    password: process.env.KIT_PASSWORD as string,
  },
  webhook: {
    lecture: (process.env.DISCORD_WEBHOOK_LECTURE || '').split(','),
    notification: (process.env.DISCORD_WEBHOOK_NOTIFICATION || '').split(','),
  },
  cookieFile: process.env.COOKIE_FILE as string,
  stateFile: {
    lecture: process.env.STATE_FILE_LECTURE as string,
    notification: process.env.STATE_FILE_NOTIFICATION as string,
  },
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    username: process.env.MYSQL_USER as string,
    password: process.env.MYSQL_PASS as string,
    database: process.env.MYSQL_DB as string,
  },
};
