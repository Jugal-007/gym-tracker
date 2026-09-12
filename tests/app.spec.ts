import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 5'] });

test('create template and verify exercise name', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  
  // Clear local storage
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1000);
  
  // Click Plans tab (it's the second tab button)
  await page.locator('nav button').nth(1).click();
  await page.waitForTimeout(500);
  
  // Click New template
  await page.locator('button', { hasText: 'New' }).click();
  await page.waitForTimeout(500);

  // Click Exercise name input
  await page.locator('button', { hasText: 'Exercise name...' }).click();
  await page.waitForTimeout(500);

  // Search and create Squat
  await page.fill('input[placeholder="Search exercises..."]', 'Squat');
  await page.locator('text="Create \\"Squat\\""').click();
  await page.waitForTimeout(500);

  // Check the button text
  const buttonText = await page.textContent('button:has-text("Squat")');
  expect(buttonText).toContain('Squat');
});
