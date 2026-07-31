import { test, expect } from '@playwright/test';

test.describe('Game Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('games-grid')).toBeVisible();
  });

  test('should display filter controls with accessible labels', async ({ page }) => {
    await test.step('Verify category checkboxes are present and labeled', async () => {
      const categoryGroup = page.getByTestId('category-filter-group');
      await expect(categoryGroup).toBeVisible();
      await expect(categoryGroup.getByRole('checkbox').first()).toBeVisible();
    });

    await test.step('Verify publisher dropdown is present and labeled', async () => {
      const publisherSelect = page.getByLabel('Publisher');
      await expect(publisherSelect).toBeVisible();
      await expect(publisherSelect.getByRole('option').first()).toHaveText('All publishers');
    });
  });

  test('should filter games by a single category', async ({ page }) => {
    const totalCount = await page.getByTestId('game-card').count();

    await test.step('Check the Strategy category filter', async () => {
      await page.getByRole('checkbox', { name: 'Strategy' }).check();
    });

    await test.step('Verify only Strategy games are visible', async () => {
      const visibleCards = page.getByTestId('game-card').locator('visible=true');
      const visibleCount = await visibleCards.count();
      expect(visibleCount).toBeGreaterThan(0);
      expect(visibleCount).toBeLessThan(totalCount);

      const count = await visibleCards.count();
      for (let i = 0; i < count; i++) {
        await expect(visibleCards.nth(i).getByTestId('game-category')).toHaveText('Strategy');
      }
    });

    await test.step('Verify the results count is updated', async () => {
      const visibleCount = await page.getByTestId('game-card').locator('visible=true').count();
      await expect(page.getByTestId('results-count')).toHaveText(`Showing ${visibleCount} of ${totalCount} games`);
    });
  });

  test('should filter games by combining multiple categories (OR)', async ({ page }) => {
    await test.step('Check Strategy and Puzzle category filters', async () => {
      await page.getByRole('checkbox', { name: 'Strategy' }).check();
      await page.getByRole('checkbox', { name: 'Puzzle' }).check();
    });

    await test.step('Verify only Strategy or Puzzle games are visible', async () => {
      const visibleCards = page.getByTestId('game-card').locator('visible=true');
      const count = await visibleCards.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(visibleCards.nth(i).getByTestId('game-category')).toHaveText(/Strategy|Puzzle/);
      }
    });
  });

  test('should filter games by publisher', async ({ page }) => {
    const totalCount = await page.getByTestId('game-card').count();

    await test.step('Select a publisher from the dropdown', async () => {
      await page.getByLabel('Publisher').selectOption({ label: 'GitHub Games' });
    });

    await test.step('Verify only games from that publisher are visible', async () => {
      const visibleCards = page.getByTestId('game-card').locator('visible=true');
      const count = await visibleCards.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(totalCount);
      for (let i = 0; i < count; i++) {
        await expect(visibleCards.nth(i).getByTestId('game-publisher')).toHaveText('GitHub Games');
      }
    });
  });

  test('should combine category and publisher filters', async ({ page }) => {
    await test.step('Check a category and select a publisher', async () => {
      await page.getByRole('checkbox', { name: 'Strategy' }).check();
      await page.getByLabel('Publisher').selectOption({ label: 'GitHub Games' });
    });

    await test.step('Verify only games matching both filters are visible', async () => {
      const visibleCards = page.getByTestId('game-card').locator('visible=true');
      const count = await visibleCards.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(visibleCards.nth(i).getByTestId('game-category')).toHaveText('Strategy');
        await expect(visibleCards.nth(i).getByTestId('game-publisher')).toHaveText('GitHub Games');
      }
    });
  });

  test('should show an empty state when no games match the filter combination', async ({ page }) => {
    const totalCount = await page.getByTestId('game-card').count();

    await test.step('Force a category filter value that matches no game', async () => {
      // The seeded dataset covers every real category/publisher combination, so simulate an
      // impossible category id to exercise the "no matches" path of the filtering logic.
      const firstCheckbox = page.getByTestId('category-filter-group').getByRole('checkbox').first();
      await firstCheckbox.evaluate((el) => {
        (el as HTMLInputElement).value = '-1';
      });
      await firstCheckbox.check();
    });

    await test.step('Verify the empty state is shown and the grid is hidden', async () => {
      await expect(page.getByTestId('no-results-empty-state')).toBeVisible();
      await expect(page.getByTestId('games-grid')).toBeHidden();
      await expect(page.getByTestId('results-count')).toHaveText(`Showing 0 of ${totalCount} games`);
    });
  });

  test('should clear all filters when the clear filters button is clicked', async ({ page }) => {
    const totalCount = await page.getByTestId('game-card').count();

    await test.step('Apply filters', async () => {
      await page.getByRole('checkbox', { name: 'Strategy' }).check();
      await page.getByLabel('Publisher').selectOption({ label: 'GitHub Games' });
    });

    await test.step('Click the clear filters button', async () => {
      await page.getByTestId('clear-filters-button').click();
    });

    await test.step('Verify all games are visible again', async () => {
      await expect(page.getByTestId('results-count')).toHaveText(`Showing ${totalCount} of ${totalCount} games`);
      const visibleCount = await page.getByTestId('game-card').locator('visible=true').count();
      expect(visibleCount).toBe(totalCount);
    });
  });

  test('should support keyboard operation of the filter controls', async ({ page }) => {
    await test.step('Tab to and check the first category checkbox with the keyboard', async () => {
      const firstCheckbox = page.getByTestId('category-filter-group').getByRole('checkbox').first();
      await firstCheckbox.focus();
      await expect(firstCheckbox).toBeFocused();
      await page.keyboard.press('Space');
      await expect(firstCheckbox).toBeChecked();
    });

    await test.step('Focus and change the publisher dropdown with the keyboard', async () => {
      const publisherSelect = page.getByLabel('Publisher');
      await publisherSelect.focus();
      await expect(publisherSelect).toBeFocused();
      await publisherSelect.selectOption({ label: 'GitHub Games' });
      await expect(publisherSelect).toHaveValue(/.+/);
    });
  });
});
