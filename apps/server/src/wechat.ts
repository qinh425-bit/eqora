export async function exchangeWechatCode(code: string) {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  const mode = process.env.WECHAT_LOGIN_MODE || "mock";

  if (!appId || !appSecret || mode !== "live") {
    return null;
  }

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`wechat login failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    openid?: string;
    unionid?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (json.errcode || !json.openid) {
    throw new Error(json.errmsg || "wechat code exchange failed");
  }

  return {
    openId: json.openid,
    unionId: json.unionid
  };
}