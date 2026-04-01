import { useEffect, useMemo, useState } from "react";
import { Button, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { saveTrainingRecord } from "@/services/api";
import type { EvaluationResult, Scenario } from "@/types";
import { formatCategory, formatDuration } from "@/utils/format";
import { getAuthToken } from "@/utils/session";
import "./index.scss";

function getScoreSummary(score: number) {
  if (score >= 85) {
    return {
      label: "很稳",
      copy: "这次回应已经有明显的结构感，不只是会说，更像是在掌控局面。"
    };
  }

  if (score >= 70) {
    return {
      label: "有底子",
      copy: "你已经知道该怎么接住场面，下一步要把边界和方案说得更清楚。"
    };
  }

  if (score >= 55) {
    return {
      label: "在起势",
      copy: "这次不是不会说，而是还没把重点说准。把结构练稳，分数会很快抬起来。"
    };
  }

  return {
    label: "需要再练",
    copy: "当前更像是情绪先跑在前面。先练稳定，再练锋利，提升会更明显。"
  };
}

export default function ReportPage() {
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [answer, setAnswer] = useState("");
  const [recordStatus, setRecordStatus] = useState("登录后可保存成长记录");

  useEffect(() => {
    const savedResult = Taro.getStorageSync("latestEvaluation");
    const savedScenario = Taro.getStorageSync("latestScenario");
    const savedAnswer = Taro.getStorageSync("latestAnswer") || "";

    setResult(savedResult);
    setScenario(savedScenario);
    setAnswer(savedAnswer);
  }, []);

  useEffect(() => {
    if (!result || !scenario) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      return;
    }

    saveTrainingRecord({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      category: scenario.category,
      overallScore: result.overallScore,
      summary: result.summary,
      answer,
      thinkingTimeMs: result.metrics.thinkingTimeMs
    })
      .then(() => {
        setRecordStatus("本次训练已保存到成长记录");
      })
      .catch(() => {
        setRecordStatus("记录保存失败，可稍后重试");
      });
  }, [answer, result, scenario]);

  const scoreSummary = useMemo(() => getScoreSummary(result?.overallScore ?? 0), [result?.overallScore]);

  if (!result || !scenario) {
    return (
      <View className='page-shell report-page'>
        <View className='content-card report-panel'>
          <Text className='section-title'>还没有训练记录</Text>
          <Button className='primary-button' onClick={() => Taro.navigateBack()}>
            返回上一页
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className='page-shell report-page'>
      <View className='hero-card score-hero fade-up'>
        <View className='report-topline'>
          <Text className='pill'>{formatCategory(scenario.category)} 场景</Text>
          <Text className='score-badge'>{scoreSummary.label}</Text>
        </View>
        <Text className='report-title'>{scenario.title}</Text>
        <Text className='score-number'>{result.overallScore}</Text>
        <Text className='score-copy'>{scoreSummary.copy}</Text>
        <Text className='section-subtitle'>{result.summary}</Text>
      </View>

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>记录状态</Text>
        <Text className='section-subtitle'>{recordStatus}</Text>
      </View>

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>这次你怎么答的</Text>
        <Text className='answer-preview'>{answer}</Text>
        <View className='metrics-grid'>
          <View className='metric-card metric-item'>
            <Text className='metric-value'>{formatDuration(result.metrics.thinkingTimeMs)}</Text>
            <Text className='metric-label'>思考时长</Text>
          </View>
          <View className='metric-card metric-item'>
            <Text className='metric-value'>{result.metrics.answerLength}</Text>
            <Text className='metric-label'>回答字数</Text>
          </View>
        </View>
      </View>

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>五维拆解</Text>
        <View className='score-list'>
          {result.scoreBreakdown.map((item) => (
            <View key={item.key} className='score-card score-item'>
              <View className='score-row'>
                <Text className='score-label'>{item.label}</Text>
                <Text className='score-value'>{item.score}</Text>
              </View>
              <View className='score-bar'>
                <View className='score-bar-fill' style={{ width: `${item.score}%` }} />
              </View>
              <Text className='section-subtitle'>{item.comment}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>这次稳住了什么</Text>
        <View className='bullet-list'>
          {result.strengths.map((item) => (
            <Text key={item} className='list-item success-item'>
              {item}
            </Text>
          ))}
        </View>
      </View>

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>还可以再补哪一步</Text>
        <View className='bullet-list'>
          {result.risks.map((item) => (
            <Text key={item} className='list-item risk-item'>
              {item}
            </Text>
          ))}
          {result.missedConsiderations.map((item) => (
            <Text key={item} className='list-item'>
              {item}
            </Text>
          ))}
        </View>
      </View>

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>更成熟的回应版本</Text>
        <Text className='quote-answer'>{result.improvedAnswer}</Text>
        <Text className='section-title advanced-title'>如果想更强势一点</Text>
        <Text className='quote-answer advanced-answer'>{result.advancedAnswer}</Text>
      </View>

      <Button
        className='primary-button fade-up'
        onClick={() =>
          Taro.reLaunch({
            url: "/pages/home/index"
          })
        }
      >
        继续下一关
      </Button>
    </View>
  );
}
