import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { JSDOM } from 'jsdom';
import { KitShibbolethProxy } from '../kit-shibboleth';
import { convertNodesToMDText } from '../utils/html-test';

const lectureInformation = t.strict({
  faculty: t.string,
  semester: t.string,
  subject: t.string,
  teacher: t.union([t.string, t.null]),
  day: t.union([t.string, t.null]),
  hour: t.union([t.string, t.null]),
  category: t.string,
  content: t.string,
  createdAt: t.string,
  updatedAt: t.string,
});
export type LectureInformation = t.TypeOf<typeof lectureInformation>;

export const fetchLectureInformation = async (proxy: KitShibbolethProxy) => {
  const res = await proxy.fetch(
    'https://portal.student.kit.ac.jp/ead/?c=lecture_information',
  );
  if (!res.ok) throw new Error('failed to fetch');

  const { window } = new JSDOM(await res.text());

  window.document.querySelectorAll('.col_red').forEach((item) => item.remove());

  const result = [].slice
    .apply<NodeListOf<Element> | undefined, Element[]>(
      window.document
        .querySelector('#class_msg_data_tbl')
        ?.querySelectorAll('tr[class*="gen_tbl1"]'),
    )
    .map((row) => ({
      faculty: row.children.item(1)?.textContent?.replace(/^-$/, '').trim(),
      semester: row.children.item(2)?.textContent?.replace(/^-$/, '').trim(),
      subject: row.children.item(3)?.textContent?.replace(/^-$/, '').trim(),
      teacher:
        row.children.item(4)?.textContent?.replace(/^-$/, '').trim() || null,
      day: row.children.item(5)?.textContent?.replace(/^-$/, '').trim() || null,
      hour:
        row.children.item(6)?.textContent?.replace(/^-$/, '').trim() || null,
      category: row.children.item(7)?.textContent?.replace(/^-$/, '').trim(),
      createdAt: row.children.item(9)?.textContent?.replace(/^-$/, '').trim(),
      updatedAt: row.children.item(10)?.textContent?.replace(/^-$/, '').trim(),
      content: convertNodesToMDText(row.children.item(8)?.childNodes).trim(),
    }));

  if (result.some((item) => isLeft(lectureInformation.decode(item))))
    throw new Error('invalid data');

  return result as LectureInformation[];
};
