import { expect, test } from '@playwright/test';

test('serves complete English and Chinese home pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Yuecheng/i, level: 1 })).toBeVisible();
  await expect(page.locator('[data-hero-portrait]')).toBeVisible();
  await expect(page.locator('[data-hero-portrait]')).toHaveAttribute('alt', /Yuecheng Wen/);
  await expect(page.getByText('3.85/4.00')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Featured systems' })).toBeVisible();
  await page.getByRole('link', { name: '中文' }).click();
  await expect(page).toHaveURL(/\/zh\/$/);
  await expect(page.getByRole('heading', { name: '温悦成', level: 1 })).toBeVisible();
  await expect(page.getByText('91.01/100')).toBeVisible();
});

test('shows the supplied terminal welcome artwork on both Harness case studies', async ({ page }) => {
  for (const path of ['/projects/yuecheng-harness/', '/zh/projects/yuecheng-harness/']) {
    await page.goto(path);
    const visual = page.locator('[data-project-visual]');
    await expect(visual).toBeVisible();
    await expect(visual).toHaveAttribute('src', '/projects/terminal-welcome.svg');
  }
});

test('opens each photograph on a complete uncropped detail page', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('#photography [data-photo-link]');
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toHaveAttribute('href', '/photography/signal-dusk/');
  await links.nth(0).click();
  await expect(page).toHaveURL(/\/photography\/signal-dusk\/$/);
  const fullPhoto = page.locator('[data-full-photo]');
  await expect(fullPhoto).toBeVisible();
  await expect(fullPhoto).toHaveCSS('object-fit', 'contain');
});

test('persists the selected theme', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('renders all bilingual case studies', async ({ page }) => {
  for (const slug of ['yuecheng-harness', 'mindbridge', 'edurag-agent', 'chat2excel']) {
    await page.goto(`/projects/${slug}/`);
    await expect(page.getByRole('heading', { name: /Problem/, level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Evaluation/, level: 2 })).toBeVisible();
    await page.goto(`/zh/projects/${slug}/`);
    await expect(page.getByRole('heading', { name: '问题', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: '评测', level: 2 })).toBeVisible();
  }
});

test('keeps the portrait still for reduced motion and uses lazy responsive photos', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('[data-hero-portrait]')).toBeVisible();
  await expect(page.locator('.portrait-scan')).toHaveCSS('animation-name', 'none');
  const photo = page.locator('#photography img').first();
  await expect(photo).toHaveAttribute('loading', 'lazy');
  await expect(photo).toHaveAttribute('srcset', /_assets/);
  await context.close();
});

test('has no horizontal overflow at the active viewport', async ({ page }) => {
  await page.goto('/');
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflows).toBe(false);
});

test('highlights the active section while scrolling', async ({ page }) => {
  await page.goto('/');
  await page.locator('#education').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-nav="education"]')).toHaveClass(/active/);
});
