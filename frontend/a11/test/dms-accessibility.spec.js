import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function preparePage(page, handlers = {}) {
  await page.addInitScript(() => {
    window.localStorage.setItem('dms-user-id', 'a11-user');
  });

  let uploaded = false;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET' && url.pathname === '/api/documents') {
      if (handlers.listError) {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Falha temporária ao carregar os documentos.',
            },
          }),
        });
      }

      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ documents: uploaded ? [handlers.document] : [] }),
      });
    }

    if (request.method() === 'POST' && url.pathname === '/api/upload') {
      if (handlers.uploadError) {
        return route.fulfill({
          status: handlers.uploadError.status,
          contentType: 'application/json',
          body: JSON.stringify({ error: handlers.uploadError }),
        });
      }

      if (handlers.holdUpload) {
        await new Promise((resolve) => {
          handlers.releaseUpload = resolve;
        });
      }

      uploaded = true;
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ document: handlers.document }),
      });
    }

    if (request.method() === 'GET' && url.pathname.endsWith('/download')) {
      return route.fulfill({
        contentType: 'text/plain',
        body: 'documento de teste',
      });
    }

    return route.fulfill({ status: 404, body: '' });
  });

  await page.goto('/');
}

async function expectNoWcagViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test('mantém navegação por teclado e oferece upload e download acessíveis', async ({ page }) => {
  const document = {
    id: 'document-1',
    originalName: 'plano.pdf',
    size: 2048,
    uploadedAt: '2026-11-10T12:00:00.000Z',
    owner: 'a11-user',
  };
  await preparePage(page, { document });

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'DMS, início' })).toBeFocused();
  await page.keyboard.press('Tab');
  const userInput = page.getByLabel('Identificador do usuário');
  await expect(userInput).toBeFocused();
  await expect(userInput).toHaveCSS('outline-style', 'solid');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'plano.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7'),
  });
  await page.getByRole('button', { name: 'Enviar documento' }).click();

  await expect(page.locator('.inline-message[role="status"]'))
    .toContainText('Arquivo enviado com sucesso.');
  await expect(page.getByText('plano.pdf')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar plano.pdf' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('plano.pdf');

  await expectNoWcagViolations(page);
});

test('anuncia erro de upload sem introduzir violações WCAG', async ({ page }) => {
  await preparePage(page, {
    uploadError: {
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: 'O arquivo excede o tamanho máximo permitido.',
    },
  });

  await page.locator('input[type="file"]').setInputFiles({
    name: 'arquivo-grande.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('arquivo'),
  });
  await page.getByRole('button', { name: 'Enviar documento' }).click();

  await expect(page.getByRole('alert')).toContainText(
    'O arquivo excede o tamanho máximo permitido.',
  );
  await expectNoWcagViolations(page);
});

test('impede trocar o usuário enquanto o envio está em andamento', async ({ page }) => {
  const handlers = { holdUpload: true };
  await preparePage(page, handlers);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'documento.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('documento'),
  });
  await page.getByRole('button', { name: 'Enviar documento' }).click();

  await expect(page.getByLabel('Identificador do usuário')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Aplicar' })).toBeDisabled();
  handlers.releaseUpload();

  await expect(page.locator('.inline-message[role="status"]'))
    .toContainText('Arquivo enviado com sucesso.');
});

test('anuncia falha na listagem e mantém a ação de recuperação acessível', async ({ page }) => {
  await preparePage(page, { listError: true });

  await expect(page.getByRole('alert')).toContainText(
    'Falha temporária ao carregar os documentos.',
  );
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  await expectNoWcagViolations(page);
});