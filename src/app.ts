import { createHash } from 'crypto';
import { existsSync, promises as fs } from 'fs';
import fetch from 'node-fetch';
import { Store } from 'tough-cookie';
import FileCookieStore from 'tough-cookie-file-store';
import { config } from './config';
import { fetchLectureInformation, LectureInformation } from './kit-ead-portal';
import { KitShibbolethProxy } from './kit-shibboleth';

const loadState = async () => {
  if (!existsSync(config.stateFile.lecture)) return [];

  const content = await fs.readFile(config.stateFile.lecture, {
    encoding: 'utf8',
  });

  try {
    return JSON.parse(content) as string[];
  } catch (e) {
    return [];
  }
};

const calcHashes = (info: LectureInformation[]) => {
  return info.map((item) =>
    createHash('sha256')
      .update(
        [
          item.faculty,
          item.semester,
          item.subject,
          item.teacher,
          item.day,
          item.hour,
          item.category,
          item.content,
          item.createdAt,
          item.updatedAt,
        ].join(''),
      )
      .digest('hex'),
  );
};

const notifyLecture = async (info: LectureInformation) => {
  const res = await fetch(config.webhook.lecture, {
    method: 'POST',
    body: JSON.stringify({
      embeds: [
        {
          title: `[${info.category}] ${info.subject}`,
          author: {
            name: '授業連絡',
          },
          description: info.content,
          fields: [
            {
              name: '学部・学期',
              value: `${info.faculty} ${info.semester}`,
              inline: true,
            },
            {
              name: '時限',
              value: `${info.day || '不明'}${
                info.hour ? info.hour + '限' : ''
              }`,
              inline: true,
            },
            {
              name: '教員',
              value: info.teacher,
              inline: true,
            },
          ],
          footer: {
            text: `更新:${info.updatedAt} 作成:${info.createdAt}`,
          },
        },
      ],
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error('failed to call hook');
  }
};
(async () => {
  const store = (new FileCookieStore('cookies.json') as unknown) as Store;

  const kit = new KitShibbolethProxy(
    config.kit.username,
    config.kit.password,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.92 Safari/537.36',
    store,
  );
  await kit.loginTo('https://portal.student.kit.ac.jp');

  const stateHash = await loadState();

  const res = await fetchLectureInformation(kit);

  const resHash = calcHashes(res);
  const lastIndex = resHash.findIndex((itemHash) =>
    stateHash.includes(itemHash),
  );
  if (lastIndex === -1) {
    console.log('reset');
  } else {
    console.log('notify', lastIndex);
    for (const item of res.slice(0, lastIndex)) {
      await notifyLecture(item);
    }
  }

  await fs.writeFile(config.stateFile.lecture, JSON.stringify(resHash), {
    encoding: 'utf8',
  });
})();
