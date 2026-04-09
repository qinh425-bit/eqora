import { useEffect, useMemo, useState } from "react";
import { Button, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import V2BottomNav from "@/components/v2-bottom-nav";
import { fetchMe, fetchScenarios, fetchTrainingRecords, loginWithMiniProgram } from "@/services/api";
import type { Scenario, TrainingRecord, UserProfile } from "@/types";
import { formatCategory, formatDateTime } from "@/utils/format";
import { clearAuthToken, getAuthToken } from "@/utils/session";
import "./index.scss";

function countRecentTrainings(records: TrainingRecord[], days: number) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return records.filter((item) => new Date(item.createdAt).getTime() >= since).length;
}

function buildTrend(records: TrainingRecord[]) {
  const latest = records.slice(0, 5).reverse();
  if (!latest.length) {
    return [24, 36, 44, 52, 60];
  }

  const points = latest.map((item) => Math.max(18, Math.min(100, item.overallScore)));
  while (points.length < 5) {
    points.unshift(points[0]);
  }

  return points;
}

function findWeakestCategory(records: TrainingRecord[]) {
  if (!records.length) {
    return null;
  }

  const bucket = new Map<string, { total: number; count: number }>();
  records.forEach((item) => {
    const current = bucket.get(item.category) ?? { total: 0, count: 0 };
    bucket.set(item.category, { total: current.total + item.overallScore, count: current.count + 1 });
  });

  return [...bucket.entries()]
    .map(([category, value]) => ({ category, avg: value.total / value.count }))
    .sort((a, b) => a.avg - b.avg)[0]?.category ?? null;
}

function findSuggestedScenario(scenarios: Scenario[], records: TrainingRecord[]) {
  const weakestCategory = findWeakestCategory(records);
  if (weakestCategory) {
    return scenarios.find((item) => item.category === weakestCategory) ?? null;
  }

  return scenarios.find((item) => item.difficulty === "easy") ?? scenarios[0] ?? null;
}

function buildGrowthStage(records: TrainingRecord[], averageScore: number) {
  if (!records.length) {
    return "起步期";
  }

  if (averageScore >= 80) {
    return "稳定输出";
  }

  if (averageScore >= 65) {
    return "进入成型";
  }

  return "持续补强";
}

export default function ProfileV2Page() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadProfile() {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setRecords([]);
      return;
    }

    try {
      const [profile, items] = await Promise.all([fetchMe(), fetchTrainingRecords()]);
      const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUser(profile);
      setRecords(sorted);
    } catch (_error) {
      clearAuthToken();
      setUser(null);
      setRecords([]);
    }
  }

  useEffect(() => {
    loadProfile();
    fetchScenarios().then(setScenarios);
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
  const recentCount = useMemo(() => countRecentTrainings(records, 7), [records]);
  const bestScore = useMemo(() => (records.length ? Math.max(...records.map((item) => item.overallScore)) : 0), [records]);
  const trend = useMemo(() => buildTrend(records), [records]);
  const weakestCategory = useMemo(() => findWeakestCategory(records), [records]);
  const suggestedScenario = useMemo(() => findSuggestedScenario(scenarios, records), [records, scenarios]);
  const latestRecord = records[0] ?? null;
  const growthStage = useMemo(() => buildGrowthStage(records, averageScore), [averageScore, records]);

  async function handleWechatLogin() {
    setLoading(true);

    try {
      await loginWithMiniProgram();
      await loadProfile();
      Taro.showToast({ title: "微信登录成功", icon: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "登录失败";
      await Taro.showModal({
        title: "微信登录失败",
        content: message,
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

  function openScenario(scenarioId?: string) {
    if (!scenarioId) {
      return;
    }

    Taro.navigateTo({ url: `/pages/challenge-v2/index?scenarioId=${scenarioId}` });
  }

  const quickMenus = [
    {
      icon: "练",
      tone: "teal",
      title: "继续训练",
      copy: latestRecord ? latestRecord.scenarioTitle : "从第一关开始",
      action: () => openScenario(latestRecord?.scenarioId ?? suggestedScenario?.id)
    },
    {
      icon: "焦",
      tone: "slate",
      title: "当前重点",
      copy: weakestCategory ? formatCategory(weakestCategory) : "等待生成",
      action: () => openScenario(suggestedScenario?.id)
    },
    {
      icon: "隐",
      tone: "ice",
      title: "隐私政策",
      copy: "查看数据和权限说明",
      action: () => Taro.navigateTo({ url: "/pages/privacy/index" })
    },
    {
      icon: "约",
      tone: "ice",
      title: "用户协议",
      copy: "查看产品使用规则",
      action: () => Taro.navigateTo({ url: "/pages/agreement/index" })
    }
  ];

  return (
    <View className='profile-v2-page'>
      <View className='profile-v2-hero'>
        <View className='profile-v2-hero-orbit orbit-a' />
        <View className='profile-v2-hero-orbit orbit-b' />
        <View className='profile-v2-topbar'>
          <Text className='profile-v2-mark'>PROFILE</Text>
          <Text className='profile-v2-mark profile-v2-mark-sub'>成长档案</Text>
        </View>
      </View>

      <View className='profile-v2-shell'>
        <View className='profile-v2-card fade-up'>
          <View className='profile-v2-avatar'>
            <Text>{user?.nickname?.slice(0, 1) ?? "未"}</Text>
          </View>
          <Text className='profile-v2-name'>{user?.nickname ?? "还没有登录"}</Text>
          <Text className='profile-v2-motto'>
            {user ? "这里会沉淀你每一次练习留下的得分、总结和成长轨迹。" : "登录后，你的训练记录、得分和建议都会保存在这里。"}
          </Text>

          <View className='profile-v2-status-row'>
            <Text className={`profile-v2-status-pill ${user ? "is-live" : "is-idle"}`}>{user ? "微信已连接" : "等待登录"}</Text>
            <Text className='profile-v2-status-pill'>{`近 7 天 ${recentCount} 次`}</Text>
            <Text className='profile-v2-status-pill'>{growthStage}</Text>
          </View>

          <View className='profile-v2-stats'>
            <View className='profile-v2-stat'>
              <Text className='profile-v2-stat-value'>{records.length}</Text>
              <Text className='profile-v2-stat-label'>累计训练</Text>
            </View>
            <View className='profile-v2-divider' />
            <View className='profile-v2-stat'>
              <Text className='profile-v2-stat-value'>{recentCount}</Text>
              <Text className='profile-v2-stat-label'>近 7 天</Text>
            </View>
            <View className='profile-v2-divider' />
            <View className='profile-v2-stat'>
              <Text className='profile-v2-stat-value'>{averageScore}</Text>
              <Text className='profile-v2-stat-label'>平均分</Text>
            </View>
          </View>

          <View className='profile-v2-actions'>
            {user ? (
              <>
                <Button className='profile-v2-primary-button' onClick={() => openScenario(latestRecord?.scenarioId ?? suggestedScenario?.id)}>
                  {latestRecord ? "继续上次训练" : "开始第一关"}
                </Button>
                <Button className='profile-v2-secondary-button' onClick={handleLogout}>
                  退出当前账号
                </Button>
              </>
            ) : (
              <Button className='profile-v2-primary-button' loading={loading} onClick={handleWechatLogin}>
                微信登录
              </Button>
            )}
          </View>
        </View>

        <View className='profile-v2-section fade-up fade-up-delay-2'>
          <View className='profile-v2-section-head'>
            <View>
              <Text className='profile-v2-panel-mark'>TREND</Text>
              <Text className='profile-v2-section-title'>能力趋势</Text>
            </View>
            <Text className='profile-v2-section-link'>{growthStage}</Text>
          </View>

          <View className='profile-v2-trend'>
            <View className='profile-v2-trend-meta'>
              <Text className='profile-v2-trend-pill'>近 5 次训练走势</Text>
              <Text className='profile-v2-trend-note'>
                {latestRecord ? `最近一关 ${latestRecord.overallScore} 分，最佳 ${bestScore} 分` : "先完成一关，这里会开始记录你的训练走势。"}
              </Text>
            </View>
            <View className='profile-v2-bars'>
              {trend.map((value, index) => (
                <View key={`${value}-${index}`} className='profile-v2-bar-col'>
                  <View className='profile-v2-bar-track'>
                    <View className='profile-v2-bar-fill' style={{ height: `${value}%` }} />
                  </View>
                  <Text className='profile-v2-bar-label'>{index + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className='profile-v2-menu-grid fade-up fade-up-delay-2'>
          {quickMenus.map((item) => (
            <View key={item.title} className='profile-v2-menu' onClick={item.action}>
              <View className={`profile-v2-menu-icon tone-${item.tone}`}>
                <Text>{item.icon}</Text>
              </View>
              <View className='profile-v2-menu-content'>
                <Text className='profile-v2-menu-title'>{item.title}</Text>
                <Text className='profile-v2-menu-copy'>{item.copy}</Text>
              </View>
              <Text className='profile-v2-menu-arrow'>→</Text>
            </View>
          ))}
        </View>

        <View className='profile-v2-section profile-v2-records fade-up fade-up-delay-3'>
          <View className='profile-v2-section-head'>
            <View>
              <Text className='profile-v2-panel-mark'>RECENT</Text>
              <Text className='profile-v2-section-title'>最近训练</Text>
            </View>
            <Text className='profile-v2-section-link'>{records.length ? `${records.length} 条` : "还没有记录"}</Text>
          </View>

          {records.length ? (
            <View className='profile-v2-record-list'>
              {records.slice(0, 3).map((item) => (
                <View key={item.id} className='profile-v2-record-card'>
                  <View className='profile-v2-record-head'>
                    <View>
                      <Text className='profile-v2-record-tag'>{formatCategory(item.category)}</Text>
                      <Text className='profile-v2-record-title'>{item.scenarioTitle}</Text>
                      <Text className='profile-v2-record-meta'>
                        {formatCategory(item.category)} · {formatDateTime(item.createdAt)}
                      </Text>
                    </View>
                    <Text className='profile-v2-record-score'>{item.overallScore}</Text>
                  </View>
                  <Text className='profile-v2-record-summary'>{item.summary}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className='v2-empty-state'>
              <View className='v2-empty-state-icon'>
                <Text>档</Text>
              </View>
              <Text className='v2-empty-state-title'>你的成长档案还没开始记录</Text>
              <Text className='v2-empty-state-copy'>先完成一关训练，系统就会把本次得分、总结和成长建议收进这里。</Text>
            </View>
          )}
        </View>
      </View>
      <V2BottomNav active='profile' />
    </View>
  );
}
