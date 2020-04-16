import fetchNode, { RequestInfo, RequestInit, Response } from 'node-fetch';
import { Cookie, CookieJar } from 'tough-cookie';
import { promisify } from 'util';

export type Fetch = typeof fetchNode & {
  setCookie: (
    cookieOrString: Cookie | string,
    currentUrl: string,
    options: CookieJar.SetCookieOptions,
  ) => Promise<void>;
};
export const fetchFactory = (
  jar: CookieJar,
  getCookieOptions: CookieJar.GetCookiesOptions = {},
  setCookieOptions: CookieJar.SetCookieOptions = {},
): Fetch => {
  const getCookieString = promisify<
    string,
    CookieJar.GetCookiesOptions,
    string
  >(jar.getCookieString.bind(jar));
  const setCookie = promisify<
    string | Cookie,
    string,
    CookieJar.SetCookieOptions
  >(jar.setCookie.bind(jar));

  const fetch = async (
    url: RequestInfo,
    init?: RequestInit,
  ): Promise<Response> => {
    const cookie = await getCookieString(
      typeof url === 'string' ? url : 'url' in url ? url.url : url.href,
      getCookieOptions,
    );

    let oldRedirectMode: RequestInit['redirect'] = 'follow';

    if (typeof url === 'string') {
      if (!init) init = {};
      if (!init.headers) {
        init.headers = {
          Cookie: cookie,
        };
      } else if ('append' in init.headers) {
        if (typeof init.headers.append === 'string') {
          (init.headers as Record<string, string>)['Cookie'] = cookie;
        } else {
          init.headers.append('Cookie', cookie);
        }
      } else {
        (init.headers as Record<string, string>)['Cookie'] = cookie;
      }

      oldRedirectMode = init.redirect || 'follow';
      init.redirect =
        oldRedirectMode === 'follow' ? 'manual' : init.redirect || 'manual';
    } else if ('headers' in url) {
      url.headers.append('Cookie', cookie);

      oldRedirectMode = url.redirect || 'follow';
      url.redirect =
        oldRedirectMode === 'follow' ? 'manual' : url.redirect || 'manual';
    }

    const response = await fetchNode(url, init);
    if (response.headers.has('set-cookie')) {
      const cookies = response.headers.raw()['set-cookie'];
      await cookies.reduce(
        (prom, cookie) =>
          prom.then(() => setCookie(cookie, response.url, setCookieOptions)),
        Promise.resolve(),
      );
    }

    if (
      oldRedirectMode === 'follow' &&
      (response.status === 303 ||
        response.status === 301 ||
        response.status === 302)
    ) {
      if (response.headers.has('location')) {
        return fetch(response.headers.get('location')!, {
          method: 'GET',
          redirect: oldRedirectMode,
        });
      } else {
        throw new Error('location header is not preseted');
      }
    }

    return response;
  };

  (fetch as Fetch).setCookie = setCookie;
  (fetch as Fetch).isRedirect = fetchNode.isRedirect;

  return fetch as Fetch;
};
