import Taro from "@tarojs/taro";

const TOKEN_KEY = "speakwise-token";

export function getAuthToken() {
  return Taro.getStorageSync(TOKEN_KEY) || "";
}

export function setAuthToken(token: string) {
  Taro.setStorageSync(TOKEN_KEY, token);
}

export function clearAuthToken() {
  Taro.removeStorageSync(TOKEN_KEY);
}

export function getApiBase() {
  return "https://api.eqora.cn";
}
