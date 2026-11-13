import { setGlobalDispatcher, Agent } from 'undici';

setGlobalDispatcher(new Agent({
  headersTimeout: 0,   // 0 = без таймаута
  bodyTimeout: 0,
}));