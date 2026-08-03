import { expect, test } from 'playwright/test';

const STORAGE_KEY = 'bible-mindmap-v1';

async function seedCanvas(page, data) {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: STORAGE_KEY, value: data });
}

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('앱이 부팅되고 저장된 캔버스를 새로고침 뒤에도 복원한다', async ({ page }) => {
  const errors = capturePageErrors(page);
  const savedCanvas = {
    nodes: [
      {
        id: 'note-p0-restore',
        type: 'note',
        dragHandle: '.canvas-node-drag-handle',
        position: { x: 320, y: 220 },
        data: { title: 'P0 저장 복원', text: '회귀 기준선 메모' },
      },
    ],
    edges: [],
  };

  await seedCanvas(page, savedCanvas);
  await page.goto('./');

  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.locator('#boot-fallback')).toHaveCount(0);
  const restoredNode = page.locator('.react-flow__node[data-id="note-p0-restore"]');
  await expect(restoredNode).toBeVisible();
  await expect(restoredNode).toContainText('P0 저장 복원');
  await expect(restoredNode).toContainText('회귀 기준선 메모');

  await page.reload();
  await expect(restoredNode).toBeVisible();
  await expect(restoredNode).toContainText('P0 저장 복원');
  const restored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), STORAGE_KEY);
  expect(restored.nodes).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'note-p0-restore' }),
  ]));
  expect(errors).toEqual([]);
});

test.describe('모바일 핵심 생명주기', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('자료 추가 시트를 유지한 채 문맥 성경을 열고 닫는다', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('context-bible-onboarding-v1-dismissed', '1');
    });
    await page.goto('./');

    await page.getByRole('button', { name: '추가', exact: true }).click();
    const addSheet = page.locator('.mobile-add-sheet');
    await expect(addSheet).toBeVisible();

    await addSheet.getByRole('button', { name: /문맥 성경/ }).click();
    const contextDialog = page.getByRole('dialog', { name: /문맥 성경/ });
    await expect(contextDialog).toBeVisible();
    await expect(addSheet).toHaveCount(1);

    await contextDialog.getByRole('button', { name: '문맥 성경 닫기' }).click();
    await expect(contextDialog).toHaveCount(0);
    await expect(addSheet).toBeVisible();
  });
});

test('좌측 인물 결과가 단일 스크롤 영역의 끝까지 접근 가능하다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 360 });
  await page.route('**/w/api.php**', async (route) => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get('action');
    if (action === 'wbsearchentities') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ search: [{ id: 'Q25324', label: '여호수아', description: '성경 인물' }] }),
      });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        entities: {
          Q25324: {
            labels: { ko: { value: '여호수아' } },
            descriptions: { ko: { value: '모세의 후계자이며 이스라엘의 지도자' } },
            claims: {
              P31: [{ mainsnak: { datavalue: { value: { id: 'Q20643955' } } } }],
            },
          },
        },
      }),
    });
  });

  await page.goto('./');
  await page.locator('button').filter({ hasText: '인물' }).last().click();
  await page.getByPlaceholder('인물 이름 (예: 다윗, 모세, 바울)').fill('여호수아');
  await expect(page.getByText('여호와는 구원이시다', { exact: false })).toBeVisible();

  const sidebar = page.locator('.at-sidebar-panel');
  const scrollState = await sidebar.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      overflowY: style.overflowY,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    };
  });
  expect(scrollState.overflowY).toBe('auto');
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);

  const addButton = page.getByRole('button', { name: /성경 인물 추가/ });
  await addButton.scrollIntoViewIfNeeded();
  await expect(addButton).toBeVisible();
  const [sidebarBox, buttonBox] = await Promise.all([sidebar.boundingBox(), addButton.boundingBox()]);
  expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(sidebarBox.y + sidebarBox.height + 1);
});

test('배경 노드는 우하단 한 곳에서 크기를 바꾸고 연결 핸들과 본문을 보존한다', async ({ page }) => {
  const longNotes = Array.from({ length: 18 }, (_, index) => `긴 연구 메모 ${index + 1}`).join('\n');
  await seedCanvas(page, {
    nodes: [
      {
        id: 'person-p0-resize',
        type: 'person',
        dragHandle: '.canvas-node-drag-handle',
        position: { x: 320, y: 180 },
        style: { width: 520, height: 340 },
        data: {
          name: '여호수아',
          category: 'biblical',
          description: '모세의 후계자이며 이스라엘의 지도자',
          notes: longNotes,
          bibleTags: ['민수기 13:16', '여호수아 1:1-9'],
        },
      },
    ],
    edges: [],
  });

  await page.goto('./');
  await page.getByRole('button', { name: '저장소 패널 접기' }).click();
  await page.getByRole('button', { name: 'Fit View' }).click();
  await page.getByRole('button', { name: 'Zoom Out' }).click();
  await page.getByRole('button', { name: 'Zoom Out' }).click();
  const node = page.locator('.react-flow__node[data-id="person-p0-resize"]');
  await expect(node).toBeVisible();
  await node.click();

  const resizeControl = node.locator('.at-context-node-resize-control');
  await expect(resizeControl).toHaveCount(1);
  await expect(node.locator('.at-canvas-node__handle')).toHaveCount(4);

  const dragResizeBy = async (deltaX, deltaY) => {
    const box = await resizeControl.boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 12 });
    await page.mouse.up();
  };

  const before = await node.boundingBox();
  await dragResizeBy(-180, -100);
  await expect.poll(async () => (await node.boundingBox()).width).toBeLessThan(before.width - 60);

  const shrunk = await node.boundingBox();
  await dragResizeBy(240, 140);
  await expect.poll(async () => (await node.boundingBox()).width).toBeGreaterThan(shrunk.width + 80);

  const after = await node.boundingBox();
  expect(after.height).toBeGreaterThan(shrunk.height + 45);
  await expect(node.locator('.at-canvas-node__body')).toContainText('긴 연구 메모 18');

  const bodyState = await node.locator('.at-canvas-node__body').evaluate((element) => ({
    overflowY: window.getComputedStyle(element).overflowY,
    minHeight: window.getComputedStyle(element).minHeight,
  }));
  expect(bodyState.overflowY).toBe('auto');
  expect(bodyState.minHeight).toBe('0px');
  await expect(node.locator('.at-canvas-node__handle')).toHaveCount(4);
});
