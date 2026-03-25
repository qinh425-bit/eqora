# 技术架构说明

## 1. 前端

前端采用 `Taro + React + TypeScript`，优先支持：

- 微信小程序
- 抖音小程序
- H5

原因是 Taro 支持同一套 React 代码输出到 H5、React Native 和多种小程序平台，适合作为从 MVP 逐步扩展到 APP 的基座。

## 2. 后端

后端采用 `Node.js + Express + TypeScript`：

- `GET /api/scenarios`：返回训练场景
- `GET /api/quotes`：返回首页金句
- `POST /api/evaluate`：返回评分报告

## 3. AI 评分策略

当前分三层：

1. `heuristic` 模式：本地规则引擎，保证没有 API Key 也能开发
2. `deepseek` 模式：调用 DeepSeek Chat Completions，生成更自然的点评和改写
3. `openai` 模式：保留 Responses API 兼容能力

这样可以先让产品跑起来，再按成本和效果切换真实 AI。

## 4. 数据流

1. 用户进入首页，拉取场景和金句
2. 用户进入关卡，开始计时
3. 用户提交回答
4. 后端结合场景、文本、思考时长做评分
5. 前端跳转到结果页渲染报告

## 5. 下一阶段扩展

- 接入语音录制上传
- 接入 ASR 转写服务
- 保存用户练习记录
- 增加登录和会员能力