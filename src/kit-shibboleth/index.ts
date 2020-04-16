import { JSDOM } from 'jsdom';
import { stringify } from 'querystring';
import { CookieJar, MemoryCookieStore, Store } from 'tough-cookie';
import { Fetch, fetchFactory } from '../utils/fetch';

export class KitShibbolethProxy {
  private cookie: CookieJar;
  public fetch: Fetch;
  constructor(
    private username: string,
    private password: string,
    private userAgent: string,
    cookieStore: Store = new MemoryCookieStore(),
  ) {
    this.cookie = new CookieJar(cookieStore);
    this.fetch = fetchFactory(this.cookie);
  }

  public async loginTo(url: string, retries = 0) {
    const pageFetch = await this.fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
      },
      redirect: 'manual',
    });
    if (!pageFetch.headers.has('location')) {
      if (pageFetch.status !== 200) {
        // TODO: レスポンスが200でないと異常とみなす
        throw new Error(
          'login page did not return location header, but status is not 200',
        );
      }
      // TODO: リダイレクトなしでログインできたとみなす
      return;
    }

    const locationUrl = pageFetch.headers.get('location')!;
    if (
      !locationUrl.startsWith(
        'https://auth.cis.kit.ac.jp/idp/profile/SAML2/Redirect/SSO',
      )
    ) {
      if (retries < 2) {
        // 中間ページの可能性を考える
        await this.loginTo(locationUrl, retries + 1);
        return;
      } else {
        throw new Error('valid url is not presented');
      }
    }

    const ssoPreLoginRes = await this.fetch(locationUrl, {
      headers: {
        'User-Agent': this.userAgent,
      },
      redirect: 'manual',
    });
    if (
      ssoPreLoginRes.status !== 302 ||
      !ssoPreLoginRes.headers.has('location')
    ) {
      throw new Error('SSO redirect has not done');
    }

    const ssoLoginUrl = ssoPreLoginRes.headers.get('location')!;
    if (
      !ssoLoginUrl.startsWith(
        'https://auth.cis.kit.ac.jp/idp/profile/SAML2/Redirect/SSO',
      )
    ) {
      throw new Error('SSO redirect has not done (unrecognized location)');
    }

    const ssoLoginRes = await this.fetch(ssoLoginUrl, {
      headers: {
        'User-Agent': this.userAgent,
      },
      redirect: 'manual',
    });

    if (!ssoLoginRes.ok) {
      throw new Error('SSO initial page loading failed');
    }

    const ssoPostRes = await this.fetch(ssoLoginUrl, {
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'manual',
      method: 'POST',
      body: stringify({
        j_username: this.username,
        j_password: this.password,
        _eventId_proceed: '',
      }),
    });

    if (!ssoPostRes.ok) {
      throw new Error('SSO POST failed');
    }

    const ssoPostContent = await ssoPostRes.text();

    const dom = new JSDOM(ssoPostContent);
    const callbackUrl = dom.window.window.document
      .querySelector('form[action]')
      ?.getAttribute('action');
    const callbackMethod =
      dom.window.window.document
        .querySelector('form[action]')
        ?.getAttribute('method') || 'POST';
    if (!callbackUrl) {
      throw new Error('no callback url is presented');
    }

    const params: Record<string, string> = {};
    dom.window.window.document
      .querySelectorAll('input[type="hidden"]')
      .forEach((elem) => {
        if (elem.hasAttribute('name') && elem.hasAttribute('value')) {
          params[elem.getAttribute('name')!] = elem.getAttribute('value')!;
        }
      });

    if (!('SAMLResponse' in params)) {
      throw new Error('no SAML response is presented');
    }

    const actualCallbackUrl =
      callbackMethod.toLowerCase() === 'get'
        ? `${callbackUrl}?${stringify(params)}`
        : callbackUrl;
    const serviceLoginRes = await this.fetch(actualCallbackUrl, {
      headers: {
        'User-Agent': this.userAgent,
        ...(callbackMethod.toLowerCase() === 'post'
          ? { 'Content-Type': 'application/x-www-form-urlencoded' }
          : {}),
      },
      redirect: 'follow',
      method: callbackMethod,
      body:
        callbackMethod.toLowerCase() === 'post' ? stringify(params) : undefined,
    });

    if (!serviceLoginRes.ok) {
      throw new Error('SP returned error');
    }
  }
}
