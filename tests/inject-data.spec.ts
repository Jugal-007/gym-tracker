import { test, expect } from '@playwright/test';

test('inject dummy data and screenshot stats', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Inject robust dummy data
  await page.evaluate(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const dummySessions = [
      {
        id: "s1",
        startedAt: now - 5 * day,
        endedAt: now - 5 * day + 3600000,
        exercises: [
          {
            id: "e1",
            name: "Bench Press",
            sets: [
              { id: "set1", reps: 8, weight: 60, completed: true },
              { id: "set2", reps: 8, weight: 60, completed: true },
              { id: "set3", reps: 6, weight: 65, completed: true }
            ]
          },
          {
            id: "e2",
            name: "Incline Dumbbell Press",
            sets: [
              { id: "set4", reps: 10, weight: 25, completed: true },
              { id: "set5", reps: 10, weight: 25, completed: true }
            ]
          },
          {
            id: "e3",
            name: "Tricep Pushdown",
            sets: [
              { id: "set6", reps: 12, weight: 20, completed: true },
              { id: "set7", reps: 12, weight: 20, completed: true }
            ]
          }
        ]
      },
      {
        id: "s2",
        startedAt: now - 3 * day,
        endedAt: now - 3 * day + 3600000,
        exercises: [
          {
            id: "e4",
            name: "Squat",
            sets: [
              { id: "set8", reps: 5, weight: 100, completed: true },
              { id: "set9", reps: 5, weight: 100, completed: true },
              { id: "set10", reps: 5, weight: 105, completed: true, pr: "weight" }
            ]
          },
          {
            id: "e5",
            name: "Leg Extension",
            sets: [
              { id: "set11", reps: 15, weight: 50, completed: true },
              { id: "set12", reps: 15, weight: 50, completed: true }
            ]
          }
        ]
      },
      {
        id: "s3",
        startedAt: now - 1 * day,
        endedAt: now - 1 * day + 3600000,
        exercises: [
          {
            id: "e6",
            name: "Pull Up",
            sets: [
              { id: "set13", reps: 8, weight: 0, completed: true },
              { id: "set14", reps: 8, weight: 0, completed: true }
            ]
          },
          {
            id: "e7",
            name: "Barbell Row",
            sets: [
              { id: "set15", reps: 10, weight: 60, completed: true },
              { id: "set16", reps: 10, weight: 60, completed: true }
            ]
          },
          {
            id: "e8",
            name: "Bicep Curl",
            sets: [
              { id: "set17", reps: 12, weight: 15, completed: true },
              { id: "set18", reps: 12, weight: 15, completed: true }
            ]
          }
        ]
      }
    ];
    localStorage.setItem("gym_sessions", JSON.stringify(dummySessions));
  });

  // Reload to apply data
  await page.reload();

  // Wait for the app to render
  await page.waitForTimeout(500);

  // Click the Stats tab (third item in bottom nav)
  await page.click('button:has-text("Stats")');

  // Wait for animations
  await page.waitForTimeout(1000);
  
  // Screenshot the entire page
  await page.screenshot({ path: 'stats-heatmap.png', fullPage: true });
});
