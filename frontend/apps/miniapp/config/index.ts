import path from "node:path";
import { defineConfig } from "@tarojs/cli";

const packageRoot = process.cwd();

export default defineConfig({
  projectName: "unknown-client-miniapp",
  date: "2026-07-09",
  designWidth: 375,
  deviceRatio: {
    640: 2.34,
    750: 1,
    828: 1.81,
    375: 2
  },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: "webpack5",
  defineConstants: {
    __UNKNOWN_API_BASE_URL__: JSON.stringify(process.env.TARO_APP_API_BASE_URL || "")
  },
  alias: {
    "@unknown/api-client": path.resolve(packageRoot, "../packages/api-client/src"),
    "@unknown/domain": path.resolve(packageRoot, "../packages/domain/src"),
    "@unknown/hooks": path.resolve(packageRoot, "../packages/hooks/src"),
    "@unknown/ui-tokens": path.resolve(packageRoot, "../packages/ui-tokens/src")
  },
  cache: {
    enable: false
  },
  mini: {
    compile: {
      include: [
        (modulePath: string) =>
          modulePath.includes(`${path.sep}packages${path.sep}api-client${path.sep}src`) ||
          modulePath.includes(`${path.sep}packages${path.sep}domain${path.sep}src`) ||
          modulePath.includes(`${path.sep}packages${path.sep}hooks${path.sep}src`) ||
          modulePath.includes(`${path.sep}packages${path.sep}ui-tokens${path.sep}src`)
      ]
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: "module",
          generateScopedName: "[name]__[local]___[hash:base64:5]"
        }
      }
    }
  },
  h5: {}
});
