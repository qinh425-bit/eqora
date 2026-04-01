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
  statusUnknown: "尚未检测后端连接",
  statusDisconnected: "后端不可达，请确认地址、端口和服务状态",
  guestLoggedIn: "体验账号已登录",
  guestLoginFailed: "体验登录失败",
  loginSuccess: "微信登录成功",
  loginMockSuccess: "登录成功（mock）",
  loginFailedTitle: "微信登录失败",
  loginFailedHint: "请核对 AppID、AppSecret、WECHAT_LOGIN_MODE，并查看开发者工具与后端日志",
  enterApiBase: "先输入后端地址",
  apiSaved: "后端地址已保存",
  connected: "已连接账号",
  disconnected: "未登录",
  titleLoggedOut: "登录后，这里会记录你每次练习留下的成长轨迹",
  profileHintLoggedOut: "正式版默认使用线上接口。如果你要本地联调，也可以在这里临时改回自己的调试地址。",
  loginButton: "微信登录 / 开发者工具登录",
  guestButton: "创建体验账号",
  logoutButton: "退出当前账号",
  settingsTitle: "服务连接",
  settingsHint: "当前默认是正式线上接口。只有在本地联调或临时切环境时，才需要手动改这里。",
  apiPlaceholder: "输入后端地址",
  checkConnection: "检测连接",
  saveApiBase: "保存地址",
  statsTitle: "成长看板",
  totalTrainings: "累计训练",
  averageScore: "平均分",
  bestScore: "最好成绩",
  recentTitle: "最近训练",
  emptyRecords: "还没有训练记录，先去练一关，结果会自动回到这里。"
} as const;

function buildServerStatusText(mode: string, transcriptionMode: string, wechatLoginMode?: string) {
  return `评分引擎 ${mode} · 转写 ${transcriptionMode} · 微信登录 ${wechatLoginMode || "unknown"}`;
}

function buildGrowthInsight(records: TrainingRecord[]) {
  if (!records.length) {
    return {
      title: "你还没有留下训练轨迹",
      copy: "先完成一关，系统会根据你的表现生成点评，并把这次练习收进成长记录。"
    };
  }

  const latest = records[0];
  const previous = records[1];

  if (!previous) {
    return {
      title: "第一段成长曲线已经出现了",
      copy: `你已经完成第一次正式训练，最近这关聚焦在${formatCategory(latest.category)}场景。继续练 2 到 3 关，建议会更稳定。`
    };
  }

  const delta = latest.overallScore - previous.overallScore;
  if (delta >= 8) {
    return {
      title: "最近这次明显更稳了",
      copy: `和上一关相比，你这次提高了 ${delta} 分。继续保持“先接住、再表态”的结构，成长会很快显现。`
    };
  }

  if (delta <= -8) {
    return {
      title: "这次难度更高，但问题暴露得更清楚了",
      copy: "分数回落不一定是退步，往往说明你开始碰到更复杂的场景。把薄弱点拆开练，下一轮通常会回升。"
    };
  }

  return {
    title: "你的表达正在变得更成型",
    copy: "分数波动已经开始收窄，这通常意味着你不是只会背一句话，而是在逐步形成自己的回应结构。"
  };
}

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
      const sortedItems = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUser(profile);
      setRecords(sortedItems);
    } catch (_error) {
      clearAuthToken();
      setUser(null);
      setRecords([]);
    }
  }

  async function checkServer() {
    try {
      const health = await fetchServerHealth();
      setServerStatus(buildServerStatusText(health.mode, health.transcriptionMode, health.wechatLoginMode));
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

  const bestScore = useMemo(() => {
    if (!records.length) {
      return 0;
    }

    return Math.max(...records.map((item) => item.overallScore));
  }, [records]);

  const growthInsight = useMemo(() => buildGrowthInsight(records), [records]);

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
            ? `你已经留下 ${records.length} 次训练记录。真正的变化，不是某一关高分，而是越来越会在复杂场景里稳住表达。`
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

      <View className='content-card growth-panel fade-up'>
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
          <View className='metric-card metric-item'>
            <Text className='metric-value'>{bestScore}</Text>
            <Text className='metric-label'>{TEXT.bestScore}</Text>
          </View>
        </View>
        <View className='insight-card'>
          <Text className='insight-title'>{growthInsight.title}</Text>
          <Text className='section-subtitle'>{growthInsight.copy}</Text>
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
        <Text className='status-chip'>{serverStatus}</Text>
      </View>

      <View className='content-card records-panel fade-up'>
        <Text className='section-title'>{TEXT.recentTitle}</Text>
        {records.length ? (
          <View className='record-list'>
            {records.map((item, index) => (
              <View key={item.id} className='record-card'>
                <View className='record-head'>
                  <View className='record-title-wrap'>
                    <Text className='record-rank'>#{index + 1}</Text>
                    <Text className='record-title'>{item.scenarioTitle}</Text>
                  </View>
                  <Text className='record-score'>{item.overallScore}</Text>
                </View>
                <Text className='record-summary'>{item.summary}</Text>
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
          提审前建议再核对页面主体信息、联系方式和备案信息。当前版本已经提供可直接查看的协议页面。
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
