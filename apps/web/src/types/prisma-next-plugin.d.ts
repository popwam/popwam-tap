declare module "@prisma/nextjs-monorepo-workaround-plugin" {
  import type { WebpackPluginInstance } from "webpack";
  export class PrismaPlugin implements WebpackPluginInstance {
    apply(compiler: import("webpack").Compiler): void;
  }
}
