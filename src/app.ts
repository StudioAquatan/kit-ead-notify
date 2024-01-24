import { MemoryCookieStore } from 'tough-cookie';
import { notifyLecture, notifyNotification } from './bot';
import { config } from './config';
import { connect, LectureInfoEntity, NotificationEntity } from './database';
import { fetchLectureInformation, fetchNotifications } from './kit-ead-portal';
import { KitShibbolethProxy } from './kit-shibboleth';
import { sleep } from './utils/sleep';

const updateLectureInfoAndNotify = async (proxy: KitShibbolethProxy) => {
  const data = await fetchLectureInformation(proxy);
  const dbCount = await LectureInfoEntity.count();

  for (const info of data.reverse()) {
    let entity = await LectureInfoEntity.findSameEntity(info);
    let isNew = false;

    if (!entity) {
      entity = LectureInfoEntity.createFromResponse(info);
      isNew = true;
    }

    await entity.save();

    if (isNew && dbCount > 0) {
      await notifyLecture(entity);
      await sleep(5000);
    }
  }
};

const updateNotificationAndNotify = async (proxy: KitShibbolethProxy) => {
  const data = await fetchNotifications(proxy);
  const dbCount = await NotificationEntity.count();

  for (const info of data.reverse()) {
    let entity = await NotificationEntity.findSameEntity(info);
    let isNew = false;

    if (!entity) {
      entity = NotificationEntity.createFromResponse(info);
      isNew = true;
    }

    await entity.save();

    if (isNew && dbCount > 0) {
      await notifyNotification(entity);
      await sleep(5000);
    }
  }
};

(async () => {
  const db = await connect();

  let errorCount = 0;
  for (;;) {
    const kit = new KitShibbolethProxy(
      config.kit.username,
      config.kit.password,
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.92 Safari/537.36',
      new MemoryCookieStore(),
    );

    try {
      await kit.loginTo('https://portal.student.kit.ac.jp');

      await updateLectureInfoAndNotify(kit);
      await updateNotificationAndNotify(kit);
      errorCount = 0;
    } catch (e) {
      console.error(e);
      errorCount++;
      if (!db.isConnected || errorCount > 3) {
        process.exit(1);
      }
    } finally {
      await sleep(1000 * 60 * 10);
    }
  }
})();
