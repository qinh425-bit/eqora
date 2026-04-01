import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Text, Textarea, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { evaluateAnswer, fetchScenarios, fetchServerHealth, transcribeAudio } from "@/services/api";
import type { Scenario } from "@/types";
import { formatCategory, formatDifficulty, formatDuration } from "@/utils/format";
import "./index.scss";

type VoiceStatus = "idle" | "recording" | "transcribing";

function ThinkingTimerPill({ startedAt }: { startedAt: number }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    setElapsedMs(Date.now() - startedAt);

    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt]);

  return <Text className='pill timer-pill'>思考中 {formatDuration(elapsedMs)}</Text>;
}

function buildVoiceHint(envSupported: boolean, transcriptionMode: string) {
  if (!envSupported) {
    return "当前环境不支持小程序录音，先用文字训练也能完成整条闭环。";
  }

  if (transcriptionMode === "openai") {
    return "录音结束后会自动转写成文字，你可以再微调一句，让表达更稳。";
  }

  if (transcriptionMode === "tencent") {
    return "录音结束后会上传到腾讯云语音识别，通常几秒内返回文字结果。";
  }

  if (transcriptionMode === "mock") {
    return "当前是演示转写模式，适合体验录音流程，但不代表正式识别质量。";
  }

  return "服务器还未启用语音转写。你可以先口述理一遍，再把关键句写进下方作答框。";
}

export default function ChallengePage() {
  const [scenarioId, setScenarioId] = useState("");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [editorKey, setEditorKey] = useState(0);
  const [prefilledAnswer, setPrefilledAnswer] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [transcriptionMode, setTranscriptionMode] = useState("unknown");
  const [voiceHint, setVoiceHint] = useState("正在确认语音转写状态...");
  const answerRef = useRef("");
  const submittingRef = useRef(false);
  const recorderRef = useRef<ReturnType<typeof Taro.getRecorderManager> | null>(null);

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
      setPrefilledAnswer(null);
      setEditorKey((current) => current + 1);
      setStartedAt(Date.now());
    });
  }, [scenarioId]);

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
      setVoiceHint("正在录音。想到一句稳的回应就说出来，停止后会尝试自动转写。");
    });

    recorder.onStop(async (result) => {
      setVoiceStatus("transcribing");
      setVoiceHint("录音完成，正在转写中...");

      try {
        const transcriptResult = await transcribeAudio(result.tempFilePath);

        if (transcriptResult.warning && !transcriptResult.transcript) {
          setVoiceStatus("idle");
          setVoiceHint(transcriptResult.warning);
          Taro.showToast({
            title: "当前未启用正式转写",
            icon: "none"
          });
          return;
        }

        answerRef.current = transcriptResult.transcript;
        setPrefilledAnswer(transcriptResult.transcript);
        setEditorKey((current) => current + 1);
        setVoiceStatus("idle");
        setVoiceHint(`转写完成，来源：${transcriptResult.provider}`);
        Taro.showToast({
          title: "语音已转成文字",
          icon: "success"
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "转写失败";
        setVoiceStatus("idle");
        setVoiceHint(message);
        Taro.showToast({
          title: "转写失败",
          icon: "none"
        });
      }
    });

    recorder.onError(() => {
      setVoiceStatus("idle");
      setVoiceHint("录音失败，请检查麦克风权限后重试。");
      Taro.showToast({
        title: "录音失败",
        icon: "none"
      });
    });
  }, []);

  const promptTips = useMemo(() => scenario?.pitfalls ?? [], [scenario]);
  const textareaValueProps = prefilledAnswer !== null ? { value: prefilledAnswer } : {};
  const voiceReady =
    voiceSupported &&
    (transcriptionMode === "openai" || transcriptionMode === "mock" || transcriptionMode === "tencent");
  const voiceTag =
    transcriptionMode === "openai" || transcriptionMode === "tencent"
      ? "已启用转写"
      : transcriptionMode === "mock"
        ? "演示模式"
        : "未启用转写";

  async function handleStartRecord() {
    if (!voiceSupported || !recorderRef.current) {
      Taro.showToast({
        title: "当前环境暂不支持录音",
        icon: "none"
      });
      return;
    }

    if (!voiceReady) {
      Taro.showToast({
        title: "服务器暂未启用转写",
        icon: "none"
      });
      return;
    }

    try {
      await Taro.authorize({ scope: "scope.record" as never });
    } catch (_error) {
      // Some platforms will trigger permission prompts on recorder.start directly.
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
    if (!recorderRef.current) {
      return;
    }

    recorderRef.current.stop();
  }

  async function handleSubmit() {
    if (!scenario) {
      return;
    }

    const answer = answerRef.current.trim();
    if (!answer) {
      Taro.showToast({
        title: "先写下你的回答",
        icon: "none"
      });
      return;
    }

    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    Taro.showLoading({
      title: "正在生成点评",
      mask: true
    });

    try {
      const result = await evaluateAnswer({
        scenarioId: scenario.id,
        answer,
        thinkingTimeMs: Date.now() - startedAt
      });

      Taro.setStorageSync("latestEvaluation", result);
      Taro.setStorageSync("latestScenario", scenario);
      Taro.setStorageSync("latestAnswer", answer);

      Taro.navigateTo({
        url: "/pages/report/index"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "提交失败，请稍后再试";
      await Taro.showModal({
        title: "提交失败",
        content: message,
        showCancel: false
      });
    } finally {
      submittingRef.current = false;
      Taro.hideLoading();
    }
  }

  return (
    <View className='page-shell challenge-page'>
      {scenario ? (
        <>
          <View className='hero-card scenario-panel fade-up'>
            <View className='tag-row'>
              <Text className='pill'>{formatCategory(scenario.category)}</Text>
              <Text className='pill'>{formatDifficulty(scenario.difficulty)}</Text>
              <ThinkingTimerPill startedAt={startedAt} />
            </View>
            <Text className='scenario-title'>{scenario.title}</Text>
            <Text className='scenario-prompt'>{scenario.prompt}</Text>
            <View className='counterpart-box'>
              <Text className='counterpart-label'>对方发言</Text>
              <Text className='counterpart-line'>“{scenario.counterpartLine}”</Text>
            </View>
            <Text className='section-subtitle'>本关目标：{scenario.coachingGoal}</Text>
          </View>

          <View className='content-card voice-panel fade-up'>
            <View className='section-head'>
              <View>
                <Text className='section-title'>语音作答</Text>
                <Text className='section-subtitle'>{voiceHint}</Text>
              </View>
              <Text className={`pill voice-mode-pill voice-mode-${transcriptionMode}`}>{voiceTag}</Text>
            </View>
            <View className='voice-row'>
              <Text className={`voice-status voice-${voiceStatus}`}>
                {voiceStatus === "recording" ? "录音中" : voiceStatus === "transcribing" ? "转写中" : "待开始"}
              </Text>
              {voiceStatus === "recording" ? (
                <Button className='secondary-button voice-button' onClick={handleStopRecord}>
                  停止并转写
                </Button>
              ) : (
                <Button
                  className='secondary-button voice-button'
                  loading={voiceStatus === "transcribing"}
                  disabled={!voiceReady || voiceStatus === "transcribing"}
                  onClick={handleStartRecord}
                >
                  开始录音
                </Button>
              )}
            </View>
          </View>

          <View className='content-card editor-panel fade-up'>
            <Text className='section-title'>你的回应</Text>
            <Textarea
              key={`${scenario.id}-${editorKey}`}
              {...textareaValueProps}
              className='answer-box'
              maxlength={300}
              placeholder='试着写出一句既得体又有边界的回应。先接住对方，再表达你的立场和方案。'
              onInput={(event) => {
                answerRef.current = event.detail.value || "";
              }}
              onBlur={(event) => {
                answerRef.current = event.detail.value || "";
                if (prefilledAnswer !== null) {
                  setPrefilledAnswer(null);
                }
              }}
            />
            <View className='editor-foot'>
              <Text className='section-subtitle'>最多 300 字</Text>
              <Text className='section-subtitle'>建议结构：接住需求 → 说明现实 → 给出方案</Text>
            </View>
            <View className='button-stack'>
              <Button className='primary-button' onClick={handleSubmit}>
                提交并生成点评
              </Button>
            </View>
          </View>

          <View className='content-card tips-panel fade-up'>
            <Text className='section-title'>这关最容易失手的地方</Text>
            <View className='tip-list'>
              {promptTips.map((tip) => (
                <Text key={tip} className='tip-item'>
                  {tip}
                </Text>
              ))}
            </View>
            <Text className='section-subtitle'>提示：{scenario.hint}</Text>
          </View>
        </>
      ) : (
        <View className='content-card editor-panel'>
          <Text className='section-title'>正在准备场景...</Text>
        </View>
      )}
    </View>
  );
}
