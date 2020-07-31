import { Store } from 'tough-cookie';
import FileCookieStore from 'tough-cookie-file-store';
import { notifyLecture, notifyNotification } from './bot';
import { config } from './config';
import { connect, LectureInfoEntity, NotificationEntity } from './database';
import { fetchLectureInformation, fetchNotifications } from './kit-ead-portal';
import { KitShibbolethProxy } from './kit-shibboleth';
import { sleep } from './utils/sleep';

const updateLectureInfoAndNotify = async (proxy: KitShibbolethProxy) => {
  const data = await fetchLectureInformation(proxy);
  const dbCount = await LectureInfoEntity.count();

  for (const info of data) {
    let entity = await LectureInfoEntity.findSameEntity(info);
    let isNew = false;

    if (entity) {
      entity.merge(info);
      isNew = true;
    } else {
      entity = LectureInfoEntity.createFromResponse(info);
      isNew = true;
    }

    await entity.save();

    if (isNew && dbCount > 0) {
      try {
        await notifyLecture(entity);
      } catch (e) {
        console.error(e);
      } finally {
        await sleep(5000);
      }
    }
  }
};

const updateNotificationAndNotify = async (proxy: KitShibbolethProxy) => {
  const data = await fetchNotifications(proxy);
  const dbCount = await NotificationEntity.count();

  for (const info of data) {
    let entity = await NotificationEntity.findSameEntity(info);
    let isNew = false;

    if (!entity) {
      entity = NotificationEntity.createFromResponse(info);
      isNew = true;
    }

    await entity.save();

    if (isNew && dbCount > 0) {
      try {
        await notifyNotification(entity);
      } catch (e) {
        console.error(e);
      } finally {
        await sleep(5000);
      }
    }
  }
};

(async () => {
  await connect();

  const store = (new FileCookieStore('cookies.json') as unknown) as Store;

  const kit = new KitShibbolethProxy(
    config.kit.username,
    config.kit.password,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.92 Safari/537.36',
    store,
  );

  for (;;) {
    await kit.loginTo('https://portal.student.kit.ac.jp');

    try {
      await updateLectureInfoAndNotify(kit);
      await updateNotificationAndNotify(kit);
    } catch (e) {
      console.error(e);
    } finally {
      await sleep(1000 * 60 * 10);
    }
  }
})();
