# node-api-modelo

Esse é um modelo de API em NodeJS com Express, a sua configuração foi feita para trabalhar com os bancos SQL Server e Postgresql. 

Contém as rotas de login como modelo de exemplo a ser seguido, as mesmas foram configuradas utilizando JWT para autenticação e demais exemplos de rotas como:

- Upload de arquivos para o S3;
- Utilizacação de comandos CMD;
- Envio de e-mail com anexo;
- Exportação de arquivos csv utilizando o comando COPY do Postgresql;
- Módulo com funções uteis (Moment.js , sha256, cmdRun)

## Instalação em ambiente de desenvolvimento

1. Instalar o nvm no Windows:
 	- Baixar o setup pelo link https://github.com/coreybutler/nvm-windows/releases, selecionar a opção nvm-setup.zip (versão baixada na criação deste tutorial 1.1.7);
	
 	- Alterar a permissão no POWERSHELL executando como Administrador para rodar scripts, seguir os passso no link: https://pt.stackoverflow.com/questions/220078/o-que-significa-o-erro-execu%C3%A7%C3%A3o-de-scripts-foi-desabilitada-neste-sistem
	
 	- Abra o CMD e instale as versões do NodeJs que irá utilizar no projeto:
	EX: `nvm install 12.13.0`
 	- Digite o comando `nvm list` para verificar se as versões foram instaladas.
 	- Para ativar uma versão do NodeJs utilize o comando 
	`nvm use [versão]`;

2. Instalar o git;
3. Via linha de comando, clonar o projeto 
```javascript
> git clone https://github.com/ipdvonline/node-api-modelo.git
> cd node-api-modelo
node-api-modelo> npm install
```
	O comando npm install irá instalar todas as dependências do projeto
	
	**Para instalar o nvm em Linux seguir o tutorial nesse link:**
	https://dev.to/danielle8farias/instalando-o-node-js-e-o-node-version-manager-nvm-no-linux-4j4g

## Instalação em ambiente de produção em servidor Linux

Já estou considerando que o ambiente de produção já possui as ferramentas instaladas:

- NodeJs;
- Git;
- Postresql para executar o comando de exportação via cmd;

1. Clonar o projeto, seguindo a etapa 3 acima. 

2. Instalar o PM2, essa ferramenta open source faz gerenciamento e deploy de aplicações Node.js em ambientes de produção:

 	- Verificar se o pm2 já está instalado digitando `pm2`, se não tiver, digitar o comando `npm install pm2 -g`;
	
 	- Após instalado, seguir o passo a passo de configuração clicando no link [Deploy de apps Node.js | Masterclass #03](https://www.youtube.com/watch?v=ICIz5dE3Xfg "Deploy de apps Node.js | Masterclass #03"), favor avançar o vídeo para 46:07 min, onde explica exatamente esse processo

## Configurando o projeto

1.  Na raiz do projeto copiar o arquivo ".env.example" e renomei para ".env" nele contém as principais variaveis de ambiente que serão utilizadas do projeto, abra o arquivo ".env" e acrescente os dados necessários.

	**Atenção:**
	O ARQUIVO ".env" ESTÁ NO GITIGNORE, NUCA SUBIR ESSE ARQUIVO PARA O REPOSITÓRIO, PARA NÃO DEIXAR AS SUAS CREDENCIAIS EXPOSTAS

	EX:
 	- PORT=3333 , "porta em que sua aplicação irá rodar";
 	- DB_HOST_MSSQL=99.999.99.99 , "Host de conexão com o banco de dados, as variáveis que possui MSSQL no final são referente a um banco SQL Server e PG no final é de Postgresql"

2.  No arquivo src/config/default.js, contém um módulo de configuração do projeto contendo acesso as credenciais e outras informações para serem utilizadas de forma global na sua aplicação. Dentro do arquivo default.js na chave "active_db", informe qual banco irá utilizar "config_db_mssql" para SQL Server ou "config_db_pg" para Postgresql.

3. Na linha de comando, dentro do seu projeto digite o seguinte comando para iniciar o seu servidor NodeJs: 
`npm run dev`

	**Esse projeto possui o Nodemon, ele faz um auto-restart da aplicação, toda vez que um arquivo do projeto for modificado.**

