import path from "node:path";
import { defineConfig } from "@tarojs/cli";

export default defineConfig({
  projectName: "speakwise-client",
  date: "2026-03-17",
  designWidth: 375,
  deviceRatio: {
    375: 2,
    750: 1,
    828: 1.81
  },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: "vite",
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [
      {
        from: "project.config.json",
        to: "dist/project.config.json"
      }
    ],
    options: {}
  },
  alias: {
    "@": path.resolve(__dirname, "..", "src")
  },
  mini: {},
  h5: {
    publicPath: "/"
  }
});