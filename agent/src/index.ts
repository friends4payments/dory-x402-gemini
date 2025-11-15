
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { createDoryAgent } from './agents/dory-agent';

export const mastra = new Mastra({
  agents: { doryAgent: await createDoryAgent() },
  logger: new PinoLogger({
    name: 'Dory',
    level: 'info',
  }),
  observability: {
    default: { enabled: false },
  }
});
