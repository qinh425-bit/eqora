import Taro from "@tarojs/taro";

const TOKEN_KEY = "speakwise-token";
const API_BASE_KEY = "speakwise-api-base";

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
  return Taro.getStorageSync(API_BASE_KEY) || "http://localhost:4000";
}

export function setApiBase(apiBase: string) {
  Taro.setStorageSync(API_BASE_KEY, apiBase);
}