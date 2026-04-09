import { useEffect, useMemo, useRef, useState } from "react";
import { Button, ScrollView, Text, Textarea, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { evaluateAnswer, fetchScenarios, fetchServerHealth, transcribeAudio } from "@/services/api";
import type { Scenario } from "@/types";
import { formatCategory, formatDifficulty, formatDuration } from "@/utils/format";
import "./index.scss";

type VoiceStatus = "idle" | "recording" | "transcribing";

function ThinkingTimerBadge({ startedAt }: { startedAt: number }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    setElapsedMs(Date.now() - startedAt);
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt]);

  return <Text className='challenge-v2-pill challenge-v2-pill-light'>思考中 {formatDuration(elapsedMs)}</Text>;
}

function estimateSessionLength(level: Scenario["difficulty"]) {
  if (level === "easy") {
    return "约 3 分钟";
  }

  if (level === "hard") {
    return "约 7 分钟";
  }

  return "约 5 分钟";
}

function buildVoiceHint(envSupported: boolean, transcriptionMode: string) {
  if (!envSupported) {
    return "当前环境暂不支持小程序录音，先用文字完成这一关也可以拿到点评。";
  }

  if (transcriptionMode === "openai" || transcriptionMode === "tencent") {
    return "录音结束后会自动转成文字，通常几秒内就会回填。";
  }

  if (transcriptionMode === "mock") {
    return "当前是演示转写模式，适合体验流程，但不代表正式识别质量。";
  }

  return "服务端还没有启用正式转写。你可以先口头梳理一遍，再把关键句写进输入框。";
}

function buildVoiceTag(mode: string) {
  if (mode === "tencent" || mode === "openai") {
    return { label: "已启用转写", tone: "teal" as const };
  }

  if (mode === "mock") {
    return { label: "演示模式", tone: "orange" as const };
  }

  return { label: "未启用转写", tone: "slate" as const };
}

function buildRecordStatusLabel(status: VoiceStatus) {
  if (status === "recording") {
    return "正在录音";
  }

  if (status === "transcribing") {
    return "正在转写";
  }

  return "可开始录音";
}

function buildAnswerHint(answerLength: number) {
  if (answerLength === 0) {
    return "先接住对方，再说明你的现实限制和下一步安排。";
  }

  if (answerLength < 18) {
    return "可以再补一句边界或方案，让回答更完整。";
  }

  if (answerLength < 45) {
    return "方向已经有了，再检查有没有把下一步说清楚。";
  }

  return "这版已经可以提交了，先看点评，再回来继续打磨。";
}

export default function ChallengeV2Page() {
  const [navMetrics, setNavMetrics] = useState({ paddingTop: 20, navHeight: 88 });
  const [scenarioId, setScenarioId] = useState("");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [editorKey, setEditorKey] = useState(0);
  const [prefilledAnswer, setPrefilledAnswer] = useState<string | null>(null);
  const [bubblePreview, setBubblePreview] = useState("");
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [transcriptionMode, setTranscriptionMode] = useState("unknown");
  const [voiceHint, setVoiceHint] = useState("正在检查语音转写状态…");
  const [submitting, setSubmitting] = useState(false);
  const answerRef = useRef("");
  const recorderRef = useRef<ReturnType<typeof Taro.getRecorderManager> | null>(null);
  const submittingRef = useRef(false);

  useLoad((params) => {
    if (params?.scenarioId) {
      setScenarioId(params.scenarioId);
    }
  });

  useEffect(() => {
    fetchScenarios().then((items) => {
      const found = items.find((item) => item.id === scenarioId) ?? items[0] ?? null;
      setScenario(found);
      answerRef.current = "";
      setBubblePreview("");
      setPrefilledAnswer(null);
      setEditorKey((current) => current + 1);
      setStartedAt(Date.now());
    });
  }, [scenarioId]);

  useEffect(() => {
    const menuButton = typeof Taro.getMenuButtonBoundingClientRect === "function" ? Taro.getMenuButtonBoundingClientRect() : null;
    const systemInfo = typeof Taro.getWindowInfo === "function" ? Taro.getWindowInfo() : Taro.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 20;

    if (menuButton?.top && menuButton?.bottom) {
      setNavMetrics({
        paddingTop: Math.max(menuButton.top, statusBarHeight) + 6,
        navHeight: menuButton.bottom + 12
      });
      return;
    }

    setNavMetrics({
      paddingTop: statusBarHeight + 6,
      navHeight: statusBarHeight + 54
    });
  }, []);

  useEffect(() => {
    const env = Taro.getEnv();
    const supported = env === Taro.ENV_TYPE.WEAPP || env === Taro.ENV_TYPE.TT;
    setVoiceSupported(supported);

    fetchServerHealth()
      .then((health) => {
        setTranscriptionMode(health.transcriptionMode);
        setVoiceHint(buildVoiceHint(supported, health.transcriptionMode));
      })
      .catch(() => {
        setTranscriptionMode("unknown");
        setVoiceHint(buildVoiceHint(supported, "disabled"));
      });

    if (!supported) {
      return;
    }

    const recorder = Taro.getRecorderManager();
    recorderRef.current = recorder;

    recorder.onStart(() => {
      setVoiceStatus("recording");
      setVoiceHint("正在录音。先自然说出来，停下后系统会自动尝试转写。");
    });

    recorder.onStop(async (result) => {
      setVoiceStatus("transcribing");
      setVoiceHint("录音完成，正在转写中…");

      try {
        const transcriptResult = await transcribeAudio(result.tempFilePath);
        const transcript = transcriptResult.transcript.trim();

        if (!transcript) {
          const warning = transcriptResult.warning || "这次没有识别到清晰内容，再试一次会更稳。";
          setVoiceStatus("idle");
          setVoiceHint(warning);
          Taro.showToast({ title: "没有识别到内容", icon: "none" });
          return;
        }

        answerRef.current = transcript;
        setBubblePreview(transcript);
        setPrefilledAnswer(transcript);
        setEditorKey((current) => current + 1);
        setVoiceStatus("idle");
        setVoiceHint("转写完成，你可以再微调一句再提交。");
        Taro.showToast({ title: "语音已转成文字", icon: "success" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "转写失败";
        setVoiceStatus("idle");
        setVoiceHint(message);
        Taro.showToast({ title: "转写失败", icon: "none" });
      }
    });

    recorder.onError(() => {
      setVoiceStatus("idle");
      setVoiceHint("录音失败，请检查麦克风权限后重试。");
      Taro.showToast({ title: "录音失败", icon: "none" });
    });
  }, []);

  const pitfalls = useMemo(() => scenario?.pitfalls ?? [], [scenario]);
  const voiceReady =
    voiceSupported &&
    (transcriptionMode === "openai" || transcriptionMode === "mock" || transcriptionMode === "tencent");
  const voiceTag = useMemo(() => buildVoiceTag(transcriptionMode), [transcriptionMode]);
  const draftAnswer = bubblePreview.trim();
  const answerLength = draftAnswer.length;
  const textareaValueProps = prefilledAnswer !== null ? { value: prefilledAnswer } : {};
  const submitDisabled = !draftAnswer || voiceStatus === "transcribing" || submitting;
  const answerHint = useMemo(() => buildAnswerHint(answerLength), [answerLength]);

  function handleBack() {
    if (Taro.getCurrentPages().length > 1) {
      Taro.navigateBack();
      return;
    }

    Taro.reLaunch({ url: "/pages/practice-v2/index" });
  }

  async function handleOpenInfo() {
    if (!scenario) {
      return;
    }

    await Taro.showModal({
      title: "场景信息",
      content: `标题：${scenario.title}\n\n目标：${scenario.coachingGoal}\n\n场景说明：${scenario.prompt}\n\n容易踩坑：${scenario.pitfalls.join("、")}`,
      showCancel: false
    });
  }

  async function handleStartRecord() {
    if (!voiceSupported || !recorderRef.current) {
      Taro.showToast({ title: "当前环境暂不支持录音", icon: "none" });
      return;
    }

    if (!voiceReady) {
      Taro.showToast({ title: "服务端暂未启用正式转写", icon: "none" });
      return;
    }

    try {
      await Taro.authorize({ scope: "scope.record" as never });
    } catch (_error) {
      // WeChat may still show its own permission dialog when recording starts.
    }

    recorderRef.current.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: "mp3" as never
    });
  }

  function handleStopRecord() {
    recorderRef.current?.stop();
  }

  async function handleSubmit() {
    if (!scenario) {
      return;
    }

    const answer = answerRef.current.trim();
    if (!answer) {
      Taro.showToast({ title: "先写下你的回答", icon: "none" });
      return;
    }

    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    Taro.showLoading({ title: "正在生成点评", mask: true });

    try {
      const result = await evaluateAnswer({
        scenarioId: scenario.id,
        answer,
        thinkingTimeMs: Date.now() - startedAt
      });

      Taro.setStorageSync("latestEvaluation", result);
      Taro.setStorageSync("latestScenario", scenario);
      Taro.setStorageSync("latestAnswer", answer);
      Taro.navigateTo({ url: "/pages/report-v2/index" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "提交失败，请稍后再试";
      await Taro.showModal({
        title: "提交失败",
        content: message,
        showCancel: false
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      Taro.hideLoading();
    }
  }

  function handleClearDraft() {
    answerRef.current = "";
    setBubblePreview("");
    setPrefilledAnswer("");
    setEditorKey((current) => current + 1);
    Taro.showToast({ title: "已清空当前回答", icon: "none" });
  }

  if (!scenario) {
    return (
      <View className='challenge-v2-page'>
        <View className='challenge-v2-loading v2-empty-state v2-empty-state-center fade-up'>
          <View className='v2-empty-state-icon'>
            <Text>EQ</Text>
          </View>
          <Text className='v2-empty-state-title'>正在准备训练场景</Text>
          <Text className='v2-empty-state-copy'>场景、提示和转写环境准备好以后，你就可以直接开始这一关。</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='challenge-v2-page'>
      <View
        className='challenge-v2-topbar'
        style={{
          paddingTop: `${navMetrics.paddingTop}px`,
          minHeight: `${navMetrics.navHeight}px`
        }}
      >
        <View className='challenge-v2-icon-button' onClick={handleBack}>
          <Text>‹</Text>
        </View>
        <View className='challenge-v2-title-wrap'>
          <Text className='challenge-v2-title'>{scenario.title}</Text>
          <Text className='challenge-v2-subtitle'>
            {formatCategory(scenario.category)} · {formatDifficulty(scenario.difficulty)} · {estimateSessionLength(scenario.difficulty)}
          </Text>
        </View>
        <View className='challenge-v2-icon-button' onClick={handleOpenInfo}>
          <Text>i</Text>
        </View>
      </View>

      <ScrollView className='challenge-v2-scroll' scrollY>
        <View className='challenge-v2-shell'>
          <View className='challenge-v2-stage fade-up'>
            <View className='challenge-v2-scene-card'>
              <Text className='challenge-v2-scene-label'>本关目标</Text>
              <Text className='challenge-v2-scene-title'>{scenario.coachingGoal}</Text>
              <Text className='challenge-v2-scene-copy'>{scenario.prompt}</Text>
              <View className='challenge-v2-scene-pills'>
                <Text className='challenge-v2-pill'>{formatCategory(scenario.category)}</Text>
                <Text className='challenge-v2-pill'>{formatDifficulty(scenario.difficulty)}</Text>
                <ThinkingTimerBadge startedAt={startedAt} />
              </View>
            </View>

            <View className='challenge-v2-quick-grid'>
              <View className='challenge-v2-quick-card'>
                <Text className='challenge-v2-quick-label'>对方更在意什么</Text>
                <Text className='challenge-v2-quick-copy'>先回应对方的情绪或期待，再表达你的边界和安排，不要一上来只讲自己的困难。</Text>
              </View>
              <View className='challenge-v2-quick-card challenge-v2-quick-card-dark'>
                <Text className='challenge-v2-quick-label'>这一关建议结构</Text>
                <Text className='challenge-v2-quick-copy'>先接住，再说现实限制，最后给时间或替代方案，让回答更稳。</Text>
              </View>
            </View>
          </View>

          <View className='challenge-v2-chat fade-up fade-up-delay-1'>
            <View className='challenge-v2-message-row'>
              <View className='challenge-v2-avatar challenge-v2-avatar-ai'>
                <Text>AI</Text>
              </View>
              <View className='challenge-v2-message-body'>
                <Text className='challenge-v2-message-author'>对方发言</Text>
                <View className='challenge-v2-bubble challenge-v2-bubble-ai'>
                  <Text className='challenge-v2-bubble-text'>“{scenario.counterpartLine}”</Text>
                </View>
              </View>
            </View>

            <View className='challenge-v2-message-row'>
              <View className='challenge-v2-avatar challenge-v2-avatar-coach'>
                <Text>教</Text>
              </View>
              <View className='challenge-v2-message-body'>
                <Text className='challenge-v2-message-author'>教练提醒</Text>
                <View className='challenge-v2-bubble challenge-v2-bubble-coach'>
                  <Text className='challenge-v2-bubble-text'>先接住对方，再说清你的现实和方案，不要一上来就硬顶回去。</Text>
                </View>
              </View>
            </View>

            <View className='challenge-v2-message-row challenge-v2-message-row-user'>
              <View className='challenge-v2-avatar challenge-v2-avatar-user'>
                <Text>我</Text>
              </View>
              <View className='challenge-v2-message-body challenge-v2-message-body-user'>
                <Text className='challenge-v2-message-author'>我的当前回答</Text>
                <View className='challenge-v2-bubble challenge-v2-bubble-user'>
                  <Text className='challenge-v2-bubble-text challenge-v2-bubble-text-user'>
                    {bubblePreview || "录音或输入后的内容，会先整理到这里，方便你再看一遍。"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className='challenge-v2-composer fade-up fade-up-delay-2'>
            <View className='challenge-v2-composer-head'>
              <View>
                <Text className='challenge-v2-composer-title'>语音作答</Text>
                <Text className='challenge-v2-composer-copy'>{voiceHint}</Text>
              </View>
              <Text className={`challenge-v2-mode-tag tone-${voiceTag.tone}`}>{voiceTag.label}</Text>
            </View>

            <Textarea
              key={`${scenario.id}-${editorKey}`}
              {...textareaValueProps}
              className='challenge-v2-textarea'
              maxlength={300}
              placeholder='先接住对方，再表达你的现实限制和下一步安排。'
              onInput={(event) => {
                const value = event.detail.value || "";
                answerRef.current = value;
                setBubblePreview(value);
                if (prefilledAnswer !== null) {
                  setPrefilledAnswer(null);
                }
              }}
              onBlur={(event) => {
                answerRef.current = event.detail.value || "";
              }}
            />

            <View className='challenge-v2-meta-row'>
              <Text className='challenge-v2-meta-copy'>{answerHint}</Text>
              <View className='challenge-v2-meta-side'>
                <Text className='challenge-v2-meta-count'>{answerLength}/300</Text>
                {!!draftAnswer && (
                  <Text className='challenge-v2-meta-link' onClick={handleClearDraft}>
                    清空重写
                  </Text>
                )}
              </View>
            </View>

            <View className='challenge-v2-action-status-row'>
              <Text className={`challenge-v2-record-status status-${voiceStatus}`}>{buildRecordStatusLabel(voiceStatus)}</Text>
            </View>

            <View className='challenge-v2-action-row'>
              <View className='challenge-v2-record-side'>
                {voiceStatus === "recording" ? (
                  <Button className='challenge-v2-record-button challenge-v2-record-button-stop' onClick={handleStopRecord}>
                    停止录音
                  </Button>
                ) : (
                  <Button
                    className='challenge-v2-record-button'
                    loading={voiceStatus === "transcribing"}
                    disabled={!voiceReady || voiceStatus === "transcribing" || submitting}
                    onClick={handleStartRecord}
                  >
                    {voiceStatus === "transcribing" ? "转写中…" : "开始录音"}
                  </Button>
                )}
              </View>

              <Button className='challenge-v2-submit' disabled={submitDisabled} loading={submitting} onClick={handleSubmit}>
                {submitting ? "正在生成…" : answerLength < 12 ? "先补完整回答" : "提交并生成点评"}
              </Button>
            </View>

            <Text className='challenge-v2-security-note'>语音仅用于转写和训练反馈，不会展示给其他用户。</Text>
          </View>

          {!!pitfalls.length && (
            <View className='challenge-v2-risk-card fade-up fade-up-delay-2'>
              <Text className='challenge-v2-section-title'>这一关先避开这些坑</Text>
              <View className='challenge-v2-risk-list'>
                {pitfalls.map((item) => (
                  <Text key={item} className='challenge-v2-risk-pill'>
                    {item}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
