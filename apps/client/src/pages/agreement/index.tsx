import { Text, View } from "@tarojs/components";
import "./index.scss";

const sections = [
  {
    title: "1. 协议范围",
    body: "本协议适用于你使用 Eqora 小程序及其相关服务的全部行为。你在登录、浏览或使用相关功能时，即视为已阅读并同意本协议。"
  },
  {
    title: "2. 服务内容",
    body: "当前版本提供场景训练、文字作答、语音转写、AI 评分、成长记录展示等功能，帮助用户完成表达训练与复盘。"
  },
  {
    title: "3. 用户行为规范",
    body: "你应合法、合规、审慎地使用本产品，不得利用本服务发布违法信息、冒充他人、攻击系统，或从事任何破坏平台稳定性的行为。"
  },
  {
    title: "4. 账号与数据",
    body: "你应妥善保管自己的登录状态和相关设备。因你主动提交的训练内容产生的风险，由你自行承担；我们会在合理范围内提供保存、展示和服务支持。"
  },
  {
    title: "5. AI 结果说明",
    body: "评分、建议回答与进阶表达属于基于当前模型生成的辅助内容，主要用于表达训练参考，不构成法律、医疗、心理或其他专业意见。"
  },
  {
    title: "6. 服务变更与中断",
    body: "在系统维护、版本升级、第三方能力波动或不可抗力情况下，服务可能出现调整、中断或延迟。我们会尽量降低对正常使用的影响。"
  },
  {
    title: "7. 知识产权",
    body: "本产品界面、题库结构、文案设计及相关功能逻辑的知识产权归产品方或合法权利人所有。未经许可，不得擅自复制、传播或用于商业用途。"
  },
  {
    title: "8. 其他",
    body: "如本协议部分条款因法律法规调整而变更，我们会及时更新并以最新公示版本为准。"
  }
] as const;

export default function AgreementPage() {
  return (
    <View className='page-shell legal-page'>
      <View className='hero-card legal-hero fade-up'>
        <Text className='pill'>用户协议</Text>
        <Text className='legal-title'>Eqora 用户协议</Text>
        <Text className='section-subtitle'>
          生效日期：2026-04-01。你在使用 Eqora 小程序相关服务前，请先阅读并理解本协议内容。
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
