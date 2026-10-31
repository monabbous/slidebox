import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: process.env.SLIDEBOX_HOSTED_LAB_URL || "http://127.0.0.1:4173",
    channel: "chromium",
  },
  webServer: process.env.SLIDEBOX_HOSTED_LAB_URL ? undefined : {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
