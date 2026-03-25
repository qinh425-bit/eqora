import { useEffect, useMemo, useState } from "react";
import { Button, Input, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import {
  createGuestSession,
  fetchMe,
  fetchServerHealth,
  fetchTrainingRecords,
  loginWithMiniProgram,
  resetSessionForApiSwitch
} from "@/services/api";
import type { TrainingRecord, UserProfile } from "@/types";
import { formatCategory, formatDateTime } from "@/utils/format";
import { clearAuthToken, getApiBase, getAuthToken, setApiBase } from "@/utils/session";
import "./index.scss";

const TEXT = {
  statusUnknown: "\u5c1a\u672a\u68c0\u6d4b\u540e\u7aef\u8fde\u63a5",
  statusConnectedPrefix: "\u540e\u7aef\u5df2\u8fde\u63a5\uff1a\u8bc4\u5206=",
  statusTranscribePrefix: "\uff0c\u8f6c\u5199=",
  statusWechatPrefix: "\uff0c\u5fae\u4fe1\u767b\u5f55=",
  statusDisconnected: "\u540e\u7aef\u4e0d\u53ef\u8fbe\uff0c\u8bf7\u786e\u8ba4\u5730\u5740\u3001\u7aef\u53e3\u548c\u672c\u5730\u670d\u52a1\u662f\u5426\u542f\u52a8",
  guestLoggedIn: "\u4f53\u9a8c\u8d26\u53f7\u5df2\u767b\u5f55",
  guestLoginFailed: "\u4f53\u9a8c\u767b\u5f55\u5931\u8d25",
  loginSuccess: "\u5fae\u4fe1\u767b\u5f55\u6210\u529f",
  loginMockSuccess: "\u767b\u5f55\u6210\u529f\uff08mock\uff09",
  loginFailedTitle: "\u5fae\u4fe1\u767b\u5f55\u5931\u8d25",
  loginFailedHint: "\u8bf7\u6838\u5bf9 AppID/AppSecret\u3001WECHAT_LOGIN_MODE\uff0c\u5e76\u67e5\u770b\u5f00\u53d1\u8005\u5de5\u5177\u4e0e\u540e\u7aef\u65e5\u5fd7",
  enterApiBase: "\u5148\u8f93\u5165\u540e\u7aef\u5730\u5740",
  apiSaved: "\u540e\u7aef\u5730\u5740\u5df2\u4fdd\u5b58",
  connected: "\u5df2\u8fde\u63a5\u8d26\u53f7",
  disconnected: "\u672a\u767b\u5f55",
  titleLoggedOut: "\u5148\u767b\u5f55\uff0c\u518d\u7d2f\u8ba1\u4f60\u7684\u8868\u8fbe\u6210\u957f\u66f2\u7ebf",
  profileHintLoggedOut: "\u5fae\u4fe1\u5f00\u53d1\u8005\u5de5\u5177\u91cc\u53ef\u4ee5\u76f4\u63a5\u70b9\u767b\u5f55\uff0c\u540e\u7aef\u4f1a\u5148\u7528 mock \u6a21\u5f0f\u5b8c\u6210\u8054\u8c03\u3002",
  profileHintPrefix: "\u5f53\u524d\u5171\u4fdd\u5b58 ",
  profileHintMiddle: " \u6b21\u8bad\u7ec3\uff0c\u5e73\u5747\u5206 ",
  loginButton: "\u5fae\u4fe1\u767b\u5f55 / \u5f00\u53d1\u8005\u5de5\u5177\u767b\u5f55",
  guestButton: "\u521b\u5efa\u4f53\u9a8c\u8d26\u53f7",
  logoutButton: "\u9000\u51fa\u5f53\u524d\u8d26\u53f7",
  settingsTitle: "\u540e\u7aef\u8054\u8c03\u5730\u5740",
  settingsHint: "\u5f00\u53d1\u8005\u5de5\u5177\u53ef\u7528 http://localhost:4000\u3002\u771f\u673a\u9884\u89c8\u65f6\u8bf7\u6539\u6210\u7535\u8111\u5c40\u57df\u7f51\u5730\u5740\uff0c\u4f8b\u5982 http://192.168.1.10:4000\u3002",
  apiPlaceholder: "\u8f93\u5165\u540e\u7aef\u5730\u5740",
  checkConnection: "\u68c0\u6d4b\u8fde\u63a5",
  saveApiBase: "\u4fdd\u5b58\u5730\u5740",
  statsTitle: "\u6210\u957f\u770b\u677f",
  totalTrainings: "\u7d2f\u8ba1\u8bad\u7ec3",
  averageScore: "\u5e73\u5747\u5206",
  recentTitle: "\u6700\u8fd1\u8bad\u7ec3",
  emptyRecords: "\u8fd8\u6ca1\u6709\u8bb0\u5f55\uff0c\u5148\u53bb\u7ec3\u4e00\u5173\u3002"
} as const;

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiBaseInput, setApiBaseInput] = useState(getApiBase());
  const [serverStatus, setServerStatus] = useState(TEXT.statusUnknown);

  async function loadProfile() {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setRecords([]);
      return;
    }

    try {
      const [profile, items] = await Promise.all([fetchMe(), fetchTrainingRecords()]);
      setUser(profile);
      setRecords(items);
    } catch (_error) {
      clearAuthToken();
      setUser(null);
      setRecords([]);
    }
  }

  async function checkServer() {
    try {
      const health = await fetchServerHealth();
      setServerStatus(
        `${TEXT.statusConnectedPrefix}${health.mode}${TEXT.statusTranscribePrefix}${health.transcriptionMode}${TEXT.statusWechatPrefix}${health.wechatLoginMode || "unknown"}`
      );
    } catch (_error) {
      setServerStatus(TEXT.statusDisconnected);
    }
  }

  useEffect(() => {
    loadProfile();
    checkServer();
  }, []);

  useDidShow(() => {
    loadProfile();
  });

  const averageScore = useMemo(() => {
    if (!records.length) {
      return 0;
    }

    return Math.round(records.reduce((sum, item) => sum + item.overallScore, 0) / records.length);
  }, [records]);

  async function handleGuestLogin() {
    try {
      await createGuestSession();
      await loadProfile();
      Taro.showToast({ title: TEXT.guestLoggedIn, icon: "success" });
    } catch (_error) {
      Taro.showToast({ title: TEXT.guestLoginFailed, icon: "none" });
    }
  }

  async function handleWechatLogin() {
    setLoading(true);
    try {
      const session = await loginWithMiniProgram();
      await loadProfile();
      Taro.showToast({
        title: session.loginMode === "live" ? TEXT.loginSuccess : TEXT.loginMockSuccess,
        icon: "success"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : TEXT.loginFailedHint;
      await Taro.showModal({
        title: TEXT.loginFailedTitle,
        content: `${message}\n\n${TEXT.loginFailedHint}`,
        showCancel: false
      });
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearAuthToken();
    setUser(null);
    setRecords([]);
  }

  async function handleSaveApiBase() {
    const nextBase = apiBaseInput.trim().replace(/\/$/, "");
    if (!nextBase) {
      Taro.showToast({ title: TEXT.enterApiBase, icon: "none" });
      return;
    }

    setApiBase(nextBase);
    resetSessionForApiSwitch();
    setUser(null);
    setRecords([]);
    await checkServer();
    Taro.showToast({ title: TEXT.apiSaved, icon: "success" });
  }

  return (
    <View className='page-shell profile-page'>
      <View className='hero-card profile-hero fade-up'>
        <Text className='pill'>{user ? TEXT.connected : TEXT.disconnected}</Text>
        <Text className='profile-title'>{user ? user.nickname : TEXT.titleLoggedOut}</Text>
        <Text className='section-subtitle'>
          {user
            ? `${TEXT.profileHintPrefix}${records.length}${TEXT.profileHintMiddle}${averageScore}`
            : TEXT.profileHintLoggedOut}
        </Text>
        <View className='button-stack'>
          {!user ? (
            <>
              <Button className='primary-button' loading={loading} onClick={handleWechatLogin}>
                {TEXT.loginButton}
              </Button>
              <Button className='secondary-button' onClick={handleGuestLogin}>
                {TEXT.guestButton}
              </Button>
            </>
          ) : (
            <Button className='secondary-button' onClick={handleLogout}>
              {TEXT.logoutButton}
            </Button>
          )}
        </View>
      </View>

      <View className='content-card settings-panel fade-up'>
        <Text className='section-title'>{TEXT.settingsTitle}</Text>
        <Text className='section-subtitle'>{TEXT.settingsHint}</Text>
        <Input
          className='api-input'
          value={apiBaseInput}
          placeholder={TEXT.apiPlaceholder}
          onInput={(event) => setApiBaseInput(event.detail.value)}
        />
        <View className='button-row'>
          <Button className='secondary-button half-button' onClick={checkServer}>
            {TEXT.checkConnection}
          </Button>
          <Button className='primary-button half-button' onClick={handleSaveApiBase}>
            {TEXT.saveApiBase}
          </Button>
        </View>
        <Text className='section-subtitle status-text'>{serverStatus}</Text>
      </View>

      <View className='content-card stats-panel fade-up'>
        <Text className='section-title'>{TEXT.statsTitle}</Text>
        <View className='stats-grid'>
          <View className='metric-card metric-item'>
            <Text className='metric-value'>{records.length}</Text>
            <Text className='metric-label'>{TEXT.totalTrainings}</Text>
          </View>
          <View className='metric-card metric-item'>
            <Text className='metric-value'>{averageScore}</Text>
            <Text className='metric-label'>{TEXT.averageScore}</Text>
          </View>
        </View>
      </View>

      <View className='content-card records-panel fade-up'>
        <Text className='section-title'>{TEXT.recentTitle}</Text>
        {records.length ? (
          <View className='record-list'>
            {records.map((item) => (
              <View key={item.id} className='record-card'>
                <View className='record-head'>
                  <Text className='record-title'>{item.scenarioTitle}</Text>
                  <Text className='record-score'>{item.overallScore}</Text>
                </View>
                <Text className='section-subtitle'>{item.summary}</Text>
                <Text className='record-meta'>
                  {formatCategory(item.category)} · {formatDateTime(item.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className='section-subtitle'>{TEXT.emptyRecords}</Text>
        )}
      </View>

      <View className='content-card legal-panel fade-up'>
        <Text className='section-title'>协议与说明</Text>
        <Text className='section-subtitle'>
          提审前建议先核对页面主体信息、联系方式和备案信息；当前版本已经提供可直接查看的协议草案页。
        </Text>
        <View className='button-row legal-row'>
          <Button className='secondary-button half-button' onClick={() => Taro.navigateTo({ url: "/pages/privacy/index" })}>
            查看隐私政策
          </Button>
          <Button className='secondary-button half-button' onClick={() => Taro.navigateTo({ url: "/pages/agreement/index" })}>
            查看用户协议
          </Button>
        </View>
      </View>
    </View>
  );
}
