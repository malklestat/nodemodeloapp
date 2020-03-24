//Extens�o que permite carregar as vari�veis de ambiente dentro do arquivo .env
require('dotenv/config');

const bodyParser    = require('body-parser');
const cors          = require('cors');
const helmet 	    = require('helmet');
const express       = require('express');
const consign       = require('consign');
const getHandler    = require('./middleware/errorHandler');
const path          = require('path');
const app           = express();
const router        = express.Router();
const authUser      = require('./middleware/authentication');
const validator     = require('./services/node_input_validator');

//CARREGA OS ARQUIVOS EST�TICOS DA APLICA��O (HTML,CSS,JAVASCRIPT)
app.use('/ifinance_web',express.static(path.resolve('../ifinance_web')));

//CONFIGURA??ES DE PACOTES DO NODE PARA A APLICA??O
app.use(cors());
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


//CARREGA OS SCRIPTS AUTOMATICAMENTE
consign()
    .include('src/routes')
    .into(router,validator);

//INFORMAR O NOME DA SUA API NO ARQUIVO .ENV, A MESMA DEVE SER UNICA POR PROJETO / PASTA API SEM ESPA�OS E ASPAS
app.use('/'+process.env.APP_NAME,authUser.validation);
app.use('/'+process.env.APP_NAME, router);
app.use('/'+process.env.APP_NAME,getHandler.errorHandler);


//INFORMAR AQUI A PORTA A SER UTILIZADA, A MESMA DEVE SER UNICA POR PROJETO / PASTA API
//EX: libbsAPI => PORTA 3333  | natulabAPI => PORTA 3334
app.listen(process.env.PORT,'localhost');
console.log('API funcionando na porta '+process.env.PORT);
