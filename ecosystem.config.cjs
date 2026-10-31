/**
 * PM2 config for the Gravekeeper bot (24/7). See deploy/DEPLOY.md.
 *   pm2 start ecosystem.config.cjs && pm2 save
 * The bot reads .env and bot-config.json from this folder, so cwd must stay the repo root.
 */
module.exports = {
  apps: [
    {
      name: 'gravekeeper-bot',
      cwd: __dirname,
      script: 'bot/pons-burn-bot.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 50,
      kill_timeout: 10000,
      time: true,
      out_file: 'logs/bot.out.log',
      error_file: 'logs/bot.err.log',
      env: {
        NODE_ENV: 'production',
        PORT: 5016,
      },
    },
  ],
};
