import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PlaywrightPageAgent } from '@midscene/web/playwright';
import { getApp } from './config-store.js';
import type { ProgressEvent } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const AUTH_DIR = path.join(ROOT, '.auth');
const CASES_DIR = path.join(ROOT, 'cases');

interface RunnerArgs {
  appId: string;
  testFile: string;
}

function send(msg: ProgressEvent) {
  process.send?.(msg);
}

async function main() {
  const { appId, testFile } = JSON.parse(process.argv[2] ?? '{}') as RunnerArgs;
  if (!appId || !testFile) {
    send({ type: 'run:error', message: 'appId и testFile обязательны' });
    process.exit(1);
  }

  send({ type: 'run:start', appId, testFile });

  let browser;
  try {
    const app = await getApp(appId);
    await fs.mkdir(AUTH_DIR, { recursive: true });
    const authFile = path.join(AUTH_DIR, `${appId}.json`);

    browser = await chromium.launch({ headless: true });
    const contextOptions = { ignoreHTTPSErrors: true };
    let context = await browser.newContext(contextOptions);

    const hasAuth = await fs
      .access(authFile)
      .then(() => true)
      .catch(() => false);

    if (!hasAuth) {
      send({ type: 'run:log', level: 'info', message: 'Выполняется вход в приложение…' });
      const loginPage = await context.newPage();
      await loginPage.goto(`${app.baseUrl}${app.login.path}`);

      const loginAgent = new PlaywrightPageAgent(loginPage, {
        onTaskStartTip: (tip: string) =>
          send({ type: 'run:tip', tip, timestamp: Date.now() }),
      }) as any;

      await loginAgent.aiAct(`Ввести "${app.login.username}" в поле логина`);
      await loginAgent.aiAct(`Ввести "${app.login.password}" в поле пароля`);
      await loginAgent.aiAct('Нажать кнопку "Войти"');
      await loginAgent.aiWaitFor('Отображается страница после успешного входа');

      await context.storageState({ path: authFile });
      await loginPage.close();
      await context.close();

      context = await browser.newContext({ ...contextOptions, storageState: authFile });
      send({ type: 'run:log', level: 'info', message: 'Сессия сохранена' });
    } else {
      context = await browser.newContext({ ...contextOptions, storageState: authFile });
      send({ type: 'run:log', level: 'info', message: 'Используется сохранённая сессия' });
    }

    const page = await context.newPage();
    const agent = new PlaywrightPageAgent(page, {
      onTaskStartTip: (tip: string) =>
        send({ type: 'run:tip', tip, timestamp: Date.now() }),
    });

    const yamlPath = path.join(CASES_DIR, testFile);
    const yamlContent = await fs.readFile(yamlPath, 'utf8');
    const { default: YAML } = await import('yaml');
    const doc = YAML.parse(yamlContent) as {
      beforeEach?: Array<Record<string, string>>;
      cases?: Array<{ name: string; steps: Array<Record<string, string>> }>;
    };

    const runSteps = async (steps: Array<Record<string, string>>) => {
      for (const step of steps) {
        if (step.gotoUrl) {
          await page.goto(step.gotoUrl);
        } else if (step.aiAct) {
          await agent.aiAct(step.aiAct);
        } else if (step.aiAssert) {
          await agent.aiAssert(step.aiAssert);
        } else if (step.aiWaitFor) {
          await agent.aiWaitFor(step.aiWaitFor);
        }
      }
    };

    const cases = doc.cases ?? [];
    for (const testCase of cases) {
      try {
        if (doc.beforeEach) await runSteps(doc.beforeEach);
        await runSteps(testCase.steps);
        send({ type: 'run:case', caseName: testCase.name, status: 'pass' });
      } catch (err) {
        send({ type: 'run:case', caseName: testCase.name, status: 'fail' });
        throw err;
      }
    }

    send({ type: 'run:end', status: 'passed', reportPath: 'midscene_run/report' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[runner error]', err);
    send({ type: 'run:error', message });
    send({ type: 'run:end', status: 'failed' });
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
}

main();