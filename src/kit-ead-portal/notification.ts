import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { JSDOM } from 'jsdom';
import { KitShibbolethProxy } from '../kit-shibboleth';
import { convertNodesToMDText } from '../utils/html-test';

const notificationItem = t.intersection([
  t.type({
    date: t.string,
    source: t.string,
    category: t.string,
    title: t.string,
  }),
  t.partial({
    description: t.string,
    url: t.string,
  }),
]);
export type NotificationItem = t.TypeOf<typeof notificationItem>;

export const fetchNotifications = async (proxy: KitShibbolethProxy) => {
  const res = await proxy.fetch('https://portal.student.kit.ac.jp/');
  if (!res.ok) throw new Error('failed to fetch');

  const {
    window: { document },
  } = new JSDOM(await res.text());

  const result = [].slice
    .apply<NodeListOf<Element> | undefined, Element[]>(
      document.querySelectorAll('.notice_list_dl[class*="cat"]'),
    )
    .map((elem) => {
      const contentNode = elem.querySelector('.nl_notice');
      const titleNode =
        elem.querySelector('.nl_notice > a') || contentNode?.childNodes.item(0);
      const descNode = contentNode?.querySelector('.notice_info');
      return {
        date: elem.querySelector('.nl_notice_date')?.textContent,
        source: elem
          .querySelector('.nl_div_in_charge')
          ?.childNodes.item(0)
          ?.textContent?.trim()
          .replace(/^〈/, ''),
        category: elem
          .querySelector('.nl_category')
          ?.childNodes.item(0)
          ?.textContent?.trim()
          .replace(/^《/, ''),
        title: titleNode?.textContent?.trim(),
        description: descNode
          ? convertNodesToMDText(descNode.childNodes)
          : undefined,
        url:
          titleNode?.nodeType === 1 && (titleNode as Element).tagName === 'A'
            ? (titleNode as Element).getAttribute('href')
            : undefined,
      };
    });

  if (result.some((item) => isLeft(notificationItem.decode(item))))
    throw new Error('invalid data');

  return result as NotificationItem[];
};
