import { expect, test } from '@playwright/test';

test('新游戏、建造、自动工作、刷新恢复并完成 Boss 战', async ({ page }) => {
  const failedResources: string[] = [];
  const pageErrors: string[] = [];
  page.on('requestfailed', (request) => failedResources.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResources.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/wowmanager/');
  const startButton = page.getByRole('button', { name: '开始新游戏' });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  await expect(page.getByRole('heading', { name: '晨星要塞' })).toBeVisible();
  const canvasHost = page.getByRole('application', { name: /8 × 8 要塞格子/ });
  await expect(canvasHost.locator('canvas')).toBeVisible();

  await page.getByRole('button', { name: /^帐篷/ }).click();
  await canvasHost.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('建筑与「帐篷」重叠');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.getByText('已建造帐篷。')).toBeVisible();

  const copper = page.locator('.resource-bar li').filter({ hasText: /^铜矿18$/ });
  await expect(copper).toBeVisible();
  const producedOre = page
    .locator('.resource-bar li')
    .filter({ hasText: /^(铜|铁|银)矿 [123]★/ })
    .first();
  await expect(producedOre).toBeVisible({ timeout: 20_000 });
  const producedOreName = await producedOre.locator('span').innerText();

  await page.getByText('存档工具').click();
  await page.getByRole('button', { name: '立即保存' }).click();
  await expect(page.getByText('本地存档已保存。')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '晨星要塞' })).toBeVisible();
  await expect(page.getByText(producedOreName, { exact: true }).first()).toBeVisible();
  await expect(
    page.locator('.resource-bar li').filter({ hasText: /^铜矿18$/ }),
  ).toBeVisible();

  await page.getByText('存档工具').click();
  await page.getByRole('button', { name: '导出存档' }).click();
  await expect(page.getByRole('alertdialog', { name: '导出当前存档？' })).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();

  await page.getByText('存档工具').click();
  await page.getByRole('button', { name: '重置存档' }).click();
  await expect(page.getByRole('alertdialog', { name: '重置本地存档？' })).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'damaged-save.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not-valid-json'),
  });
  await expect(page.getByRole('alert')).toContainText('原存档未改变');
  await expect(page.getByRole('heading', { name: '晨星要塞' })).toBeVisible();

  await page.getByRole('button', { name: '派遣队伍' }).first().click();
  await expect(page.getByText('远征队已出发：余烬谷地。')).toBeVisible();
  const bossButton = page.getByRole('button', { name: '进入 Boss 战' });
  await expect(bossButton).toBeVisible({ timeout: 25_000 });
  await bossButton.click();
  await page.getByRole('button', { name: '结算胜利' }).click();
  await expect(page.locator('.expedition-result')).toContainText('Boss 已击败');
  await expect(page.getByText(/通关 1/)).toBeVisible();

  expect(failedResources).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('320px 窄屏无横向溢出且存档菜单可操作', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/wowmanager/');
  await expect(page.getByRole('button', { name: '开始新游戏' })).toBeEnabled();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);

  await page.getByRole('button', { name: '开始新游戏' }).click();
  await expect(page.getByRole('heading', { name: '晨星要塞' })).toBeVisible();
  await page.getByText('存档工具').click();
  await expect(page.getByRole('button', { name: '立即保存' })).toBeVisible();

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});
