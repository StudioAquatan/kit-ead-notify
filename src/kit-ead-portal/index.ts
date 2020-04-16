import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { JSDOM } from 'jsdom';
import { KitShibbolethProxy } from '../kit-shibboleth';

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
      faculty: row.children.item(1)?.textContent?.replace(/^-$/, ''),
      semester: row.children.item(2)?.textContent?.replace(/^-$/, ''),
      subject: row.children.item(3)?.textContent?.replace(/^-$/, ''),
      teacher: row.children.item(4)?.textContent?.replace(/^-$/, '') || null,
      day: row.children.item(5)?.textContent?.replace(/^-$/, '') || null,
      hour: row.children.item(6)?.textContent?.replace(/^-$/, '') || null,
      category: row.children.item(7)?.textContent?.replace(/^-$/, ''),
      createdAt: row.children.item(9)?.textContent?.replace(/^-$/, ''),
      updatedAt: row.children.item(10)?.textContent?.replace(/^-$/, ''),
      content: [].slice
        .apply<NodeListOf<ChildNode> | undefined, ChildNode[]>(
          row.children.item(8)?.childNodes,
        )
        .map((child) => {
          if (child.nodeType === 3) {
            return child.textContent?.replace(/[\r\n]/g, '').trim() || '';
          }
          if (child.nodeType === 1) {
            const elem = child as Element;
            if (elem.tagName === 'BR') {
              return '\n';
            }
            if (elem.tagName === 'A') {
              return `[${elem.textContent}](${elem.getAttribute('href')})`;
            }
          }
          return '';
        })
        .join('')
        .replace(/^[\r\n]+/, ''),
    }));

  if (result.some((item) => isLeft(lectureInformation.decode(item))))
    throw new Error('invalid data');

  return result as LectureInformation[];
};
