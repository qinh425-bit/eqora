import { useEffect, useState } from "react";
import { Button, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { saveTrainingRecord } from "@/services/api";
import type { EvaluationResult, Scenario } from "@/types";
import { formatCategory, formatDuration } from "@/utils/format";
import { getAuthToken } from "@/utils/session";
import "./index.scss";

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
        <Text className='pill'>{formatCategory(scenario.category)} 场景</Text>
        <Text className='report-title'>{scenario.title}</Text>
        <Text className='score-number'>{result.overallScore}</Text>
        <Text className='section-subtitle'>{result.summary}</Text>
      </View>

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>记录状态</Text>
        <Text className='section-subtitle'>{recordStatus}</Text>
      </View>

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>本次作答</Text>
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
        <Text className='section-title'>五维评分</Text>
        <View className='score-list'>
          {result.scoreBreakdown.map((item) => (
            <View key={item.key} className='score-card score-item'>
              <View className='score-row'>
                <Text className='score-label'>{item.label}</Text>
                <Text className='score-value'>{item.score}</Text>
              </View>
              <Text className='section-subtitle'>{item.comment}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>优点</Text>
        {result.strengths.map((item) => (
          <Text key={item} className='list-item'>
            {item}
          </Text>
        ))}
      </View>

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>欠考虑的地方</Text>
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

      <View className='content-card report-panel fade-up'>
        <Text className='section-title'>优化回答</Text>
        <Text className='quote-answer'>{result.improvedAnswer}</Text>
        <Text className='section-title advanced-title'>更高级的版本</Text>
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
        继续练下一关
      </Button>
    </View>
  );
}