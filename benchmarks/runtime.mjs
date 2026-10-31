export async function withTimeout(promise, milliseconds = 30000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Benchmark trial timed out")), milliseconds); }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function prepareScene(context, url, spec) {
  const page = await context.newPage();
  try {
    await page.goto(url + "/?benchmark=1");
    await page.bringToFront();
    await page.waitForFunction(() => window.switchBench);
    const geometry = await page.evaluate(options => window.switchBench.configure(options), spec);
    if (!geometry.visible) throw new Error(`Controls are outside the viewport: ${JSON.stringify(geometry)}`);
    await page.waitForTimeout(350);
    // Warm every fresh page, not just the first occurrence of a variant.
    await withTimeout(page.evaluate(() => window.switchBench.runTrial()));
    await page.waitForTimeout(250);
    return { page, geometry };
  } catch (error) { await page.close(); throw error; }
}

export function metricValues(metrics) {
  return Object.fromEntries(metrics.map(metric => [metric.name, metric.value]));
}
