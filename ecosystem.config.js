module.exports = {
  apps : [{
    name: 'deployteste',
    script: 'server.js',

    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    args: 'one two',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  deploy : {
    production : {
      user : 'ricardo',
      host : '52.45.30.30',
      ref  : 'origin/master',
      repo : 'https://github.com/malklestat/nodeapiteste',
      path : '/var/www/meuapp',
      'post-deploy' : 'npm install && pm2 start index.js && pm2 reload ecosystem.config.js --env production'
    }
  }
};