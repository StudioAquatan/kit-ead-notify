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

  private async processSaveForm(html: string, url: string) {
    const ssoSaveFormDom = new JSDOM(html);
    const csrfSaveToken = ssoSaveFormDom.window.document
      .querySelector('[name="csrf_token"]')
      ?.getAttribute('value');
    if (!url) {
      throw new Error('No CSRF token provided');
    }

    const ssoSaveRes = await this.fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow',
      method: 'POST',
      body: stringify({
        'shib_idp_ls_success.shib_idp_session_ss': 'true',
        'shib_idp_ls_exception.shib_idp_session_ss': '',
        _eventId_proceed: '',
        csrf_token: csrfSaveToken,
      }),
    });

    if (!ssoSaveRes.ok) {
      throw new Error('SSO Finalize failed');
    }

    return ssoSaveRes;
  }

  private async processLoadForm(html: string, url: string) {
    const ssoSaveFormDom = new JSDOM(html);
    const csrfSaveToken = ssoSaveFormDom.window.document
      .querySelector('[name="csrf_token"]')
      ?.getAttribute('value');
    if (!url) {
      throw new Error('No CSRF token provided');
    }

    const ssoSaveRes = await this.fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow',
      method: 'POST',
      body: stringify({
        'shib_idp_ls_success.shib_idp_session_ss': 'true',
        'shib_idp_ls_exception.shib_idp_session_ss': '',
        'shib_idp_ls_value.shib_idp_session_ss': '',
        'shib_idp_ls_exception.shib_idp_persistent_ss': '',
        'shib_idp_ls_success.shib_idp_persistent_ss': 'true',
        'shib_idp_ls_value.shib_idp_persistent_ss': '',
        shib_idp_ls_supported: 'true',
        _eventId_proceed: '',
        csrf_token: csrfSaveToken,
      }),
    });

    if (!ssoSaveRes.ok) {
      throw new Error('SSO Finalize failed');
    }

    return ssoSaveRes;
  }

  public async processRelayForm(html: string) {
    const ssoPostDom = new JSDOM(html);
    const callbackUrl = ssoPostDom.window.window.document
      .querySelector('form[action]')
      ?.getAttribute('action');
    const callbackMethod =
      ssoPostDom.window.window.document
        .querySelector('form[action]')
        ?.getAttribute('method') || 'POST';
    if (!callbackUrl) {
      throw new Error('no callback url is presented');
    }

    const params: Record<string, string> = {};
    ssoPostDom.window.window.document
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

    return { res: serviceLoginRes, actualCallbackUrl };
  }

  public async loginTo(url: string) {
    // とりあえず最後まで
    let ssoLoginFormRes = await this.fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
      },
      redirect: 'follow',
    });

    if (
      ssoLoginFormRes.url.includes(
        'auth.cis.kit.ac.jp/idp/profile/SAML2/Redirect/SSO?execution=e1s1',
      )
    ) {
      const html = await ssoLoginFormRes.text();
      ssoLoginFormRes = await this.processLoadForm(html, ssoLoginFormRes.url);
    }

    if (
      ssoLoginFormRes.url.includes(
        'idp.cis.kit.ac.jp/idp/profile/SAML2/Redirect/SSO?execution=e1s1',
      )
    ) {
      const html = await ssoLoginFormRes.text();
      ssoLoginFormRes = await this.processLoadForm(html, ssoLoginFormRes.url);
    }

    if (
      !ssoLoginFormRes.url.includes(
        'idp.cis.kit.ac.jp/idp/profile/SAML2/Redirect/SSO?execution=',
      )
    ) {
      if (ssoLoginFormRes.status !== 200) {
        // TODO: レスポンスが200でないと異常とみなす
        throw new Error(
          'login page did not return location header, but status is not 200',
        );
      }
      return;
    }

    // CSRF token抽出
    const ssoLoginFormHtml = await ssoLoginFormRes.text();
    const ssoLoginFormDom = new JSDOM(ssoLoginFormHtml);
    const csrfLoginToken = ssoLoginFormDom.window.document
      .querySelector('[name="csrf_token"]')
      ?.getAttribute('value');
    if (!csrfLoginToken) {
      throw new Error('No CSRF token provided');
    }

    // TODO: 基本同じはず
    const ssoLoginUrl = ssoLoginFormRes.url;

    const ssoSaveFormRes = await this.fetch(ssoLoginUrl, {
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow',
      method: 'POST',
      body: stringify({
        j_username: this.username,
        j_password: this.password,
        _eventId_proceed: '',
        csrf_token: csrfLoginToken,
      }),
    });

    if (!ssoSaveFormRes.ok) {
      throw new Error('SSO Login failed');
    }

    // localStorageチェック画面(idp.cis)
    const ssoSaveHtml = await ssoSaveFormRes.text();
    const ssoSaveUrl = ssoSaveFormRes.url;

    const ssoPostRes = await this.processSaveForm(ssoSaveHtml, ssoSaveUrl);

    // 最終画面(idp.cis)
    const ssoPostHtml = await ssoPostRes.text();
    const { res: authSaveRes, actualCallbackUrl } = await this.processRelayForm(
      ssoPostHtml,
    );

    if (
      !actualCallbackUrl.includes(
        'auth.cis.kit.ac.jp/idp/profile/Authn/SAML2/POST/SSO',
      )
    ) {
      // 多段relayじゃない
      return;
    }

    // localStorageチェック画面(auth.cis)
    const authSaveHtml = await authSaveRes.text();
    const authSaveUrl = authSaveRes.url;

    const authPostRes = await this.processSaveForm(authSaveHtml, authSaveUrl);

    await this.processRelayForm(await authPostRes.text());
  }
}
