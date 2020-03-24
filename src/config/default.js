//Extensão que permite carregar as variáveis de ambiente dentro do arquivo .env
require('dotenv/config');

module.exports = {
    app_name:process.env.APP_NAME,
    version: "1.0.0",
    active_db:"config_db_pg",
    config_db_mssql:{
        user: process.env.DB_USER_MSSQL,
        password: process.env.DB_PASS_MSSQL,
        server: process.env.DB_HOST_MSSQL,
        database: process.env.DB_DATABASE_MSSQL,
        options: {
            encrypt: false,
            enableArithAbort: true
        },
    },
    config_db_pg:{
        user: process.env.DB_USER_PG,
        password: process.env.DB_PASS_PG,
        host: process.env.DB_HOST_PG,
        database: process.env.DB_DATABASE_PG
    },
    aws_secret_access: process.env.AWS_SECRET_ACCESS,
    aws_access_key: process.env.AWS_ACCESS_KEY,
    aws_bucket: process.env.AWS_BUCKET,
    aws_region: process.env.AWS_REGION,
    jwt_secret_token: process.env.SECRET_TOKEN_JWT,
    jwt_seconds_token_expire: 3000,
    jwt_seconds_limit_update: 2500,
    smtp_username:process.env.SMTP_USERNAME,
    smtp_password:process.env.SMTP_PASSWORD,
    smtp_host:process.env.SMTP_HOST,
    smtp_port:process.env.SMTP_PORT,
    smtp_encryption:process.env.SMTP_ENCRYPTION    
    
}

