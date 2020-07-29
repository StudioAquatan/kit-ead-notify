import { createConnection } from 'typeorm';
import { config } from '../config';
import { LectureInfoEntity } from './LectureInfo';
import { NotificationEntity } from './Notification';

export const connect = () => {
  return createConnection({
    type: 'mysql',
    entities: [LectureInfoEntity, NotificationEntity],
    synchronize: true,
    ...config.mysql,
  });
};

export { LectureInfoEntity, NotificationEntity };
