import { Text, View } from "@tarojs/components";
import "./index.scss";

const sections = [
  {
    title: "1. 适用范围",
    body: "本隐私政策适用于你使用 Eqora 小程序及相关服务的过程。若后续扩展到其他平台，我们会在对应版本中同步更新。"
  },
  {
    title: "2. 我们收集的信息",
    body: "为了完成登录、保存训练记录、展示成长数据和提供语音转写服务，我们可能收集微信登录标识、昵称、头像、训练记录、评分结果、思考时长，以及你主动提交的文字和语音内容。"
  },
  {
    title: "3. 信息使用目的",
    body: "我们使用上述信息用于识别账号、保存训练结果、生成评分和建议、展示成长趋势、优化题库体验，并保障服务稳定运行。"
  },
  {
    title: "4. 第三方能力说明",
    body: "当前版本可能调用微信登录、语音识别和 AI 评分等第三方能力。相关数据仅在完成对应功能所必需的范围内处理，不会被用于与训练无关的用途。"
  },
  {
    title: "5. 信息存储与保护",
    body: "我们会在服务器端保存必要的账号信息和训练记录，并通过访问控制、密钥管理和最小化存储原则保护你的数据安全。"
  },
  {
    title: "6. 你的权利",
    body: "你可以通过停止使用、退出账号或联系产品方的方式，申请查询、更正或删除与你相关的个人信息。"
  },
  {
    title: "7. 未成年人说明",
    body: "若你是未成年人，请在监护人同意和指导下使用本产品。"
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
        <Text className='pill'>隐私政策</Text>
        <Text className='legal-title'>Eqora 隐私政策</Text>
        <Text className='section-subtitle'>
          最近更新时间：2026-04-01。当前版本适用于 Eqora 小程序提供的登录、训练、评分、记录与语音能力。
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
