import { DateTime } from 'luxon';
import fetch from 'node-fetch';
import { config } from './config';
import { LectureInfoEntity, NotificationEntity } from './database';

export const notifyLecture = async (info: LectureInfoEntity) => {
  const updatedAt = DateTime.fromJSDate(info.updatedAt);
  const createdAt = DateTime.fromJSDate(info.createdAt);
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
            text: `更新:${updatedAt.toFormat(
              'yyyy/MM/dd',
            )} 作成:${createdAt.toFormat('yyyy/MM/dd')}`,
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

export const notifyNotification = async (info: NotificationEntity) => {
  const publishedAt = DateTime.fromJSDate(info.publishedAt);
  const embed: Record<string, unknown> = {
    title: `[${info.category}] ${info.title}`,
    author: {
      name: '学生情報ポータル',
    },
    description: info.description,
    footer: {
      text: `${publishedAt.toFormat('yyyy/MM/dd')}`,
    },
  };

  if (info.url) {
    embed.url = info.url;
  }
  const res = await fetch(config.webhook.lecture, {
    method: 'POST',
    body: JSON.stringify({
      embeds: [embed],
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error('failed to call hook');
  }
};
