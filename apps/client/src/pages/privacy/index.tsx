import { Text, View } from "@tarojs/components";
import "./index.scss";

const sections = [
  {
    title: "1. 适用范围",
    body: "本隐私政策适用于 Eqora 表达训练小程序当前版本。若后续扩展到 App 或其他平台，我们会在对应版本中同步更新。"
  },
  {
    title: "2. 我们收集的信息",
    body: "为了完成登录、训练记录保存与成长页展示，我们可能收集微信登录标识、昵称、头像、训练记录、评分结果、思考时长，以及你主动提交的文字作答内容。若你使用语音功能，还会涉及录音文件与转写结果。"
  },
  {
    title: "3. 信息使用目的",
    body: "我们使用上述信息用于完成账号识别、保存训练记录、生成评分报告、展示成长趋势、优化题库与产品体验，以及保障服务稳定运行。"
  },
  {
    title: "4. 第三方能力说明",
    body: "当前版本可能调用微信登录能力，以及 AI 评分或语音转写服务。对应数据仅在完成功能所必需的范围内使用，不会用于与你当前训练无关的用途。"
  },
  {
    title: "5. 信息存储与保护",
    body: "当前环境会在服务端保存必要的账号信息与训练记录。我们会尽力通过访问控制、密钥管理和最小化存储原则保护你的数据安全。"
  },
  {
    title: "6. 你的权利",
    body: "你可以通过停止使用、退出账号或联系产品方等方式申请查询、更正或删除相关信息。正式上线前，请在这里补齐主体名称、联系方式与处理路径。"
  },
  {
    title: "7. 未成年人说明",
    body: "若你为未成年人，请在监护人同意和指导下使用本产品。"
  },
  {
    title: "8. 政策更新",
    body: "当产品功能、处理方式或合规要求发生变化时，我们会更新本页面内容，并以最新版本为准。"
  }
] as const;

export default function PrivacyPage() {
  return (
    <View className='page-shell legal-page'>
      <View className='hero-card legal-hero fade-up'>
        <Text className='pill'>提审准备草案</Text>
        <Text className='legal-title'>Eqora 隐私政策</Text>
        <Text className='section-subtitle'>
          最后更新时间：2026-03-18。当前适用于小程序测试与提审准备阶段，正式上线前建议补齐主体名称、联系方式和备案展示信息。
        </Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} className='content-card legal-section fade-up'>
          <Text className='section-title'>{section.title}</Text>
          <Text className='legal-copy'>{section.body}</Text>
        </View>
      ))}
    </View>
  );
}
