export interface AppConfig {
  id: string;
  name: string;
  baseUrl: string;
  login: {
    path: string;
    username: string;
    password: string;
  };
}
export type AppPublic = Omit<AppConfig, 'login'> & {
  login: { path: string; username: string };
};
export interface TestMeta {
  filename: string;
  name: string;
  caseCount: number;
}
export type ProgressEvent =
  | { type: 'run:start'; appId: string; testFile: string }
  | { type: 'run:tip'; tip: string; timestamp: number }
  | { type: 'run:log'; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'run:case'; caseName: string; status: 'pass' | 'fail' }
  | { type: 'run:end'; status: 'passed' | 'failed'; reportPath?: string }
  | { type: 'run:error'; message: string };