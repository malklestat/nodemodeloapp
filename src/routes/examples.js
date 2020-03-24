'use strict';
//PARA MAIOR SEGURANÇA, CRIAR TODAS AS APIS COM O METHOD POST

const helpers       = require('../services/helpers');
const config        = require('../config/default');
const path          = require('path');
const execSQLQuery  = require('../services/sql-qry');
const multer        = require('multer');
const upload = multer({storage: multer.memoryStorage()});
const timeout       = require('connect-timeout');

module.exports = (router,validator) => {
    
    router.post('/teste', async (req,res) => {
        
        var args = await validator.init(res,req.body,{
            email: 'required|email',
            password: 'required|numeric'
        });

        setTimeout(function(){
            res.send({
                message: 'POST teste 2',
                token: req.token,
                args: args,
                jwt_access_key: req.jwt_access_key,
                jwt_user_id:req.jwt_user_id,
                jwt_job_id: req.jwt_job_id,
                helpers: helpers.dateFormat.now('date')
            });
        },1000)        

        
    });

    router.post('/selectTesteSQL', async (req, res) => {
        
        var args = await validator.init(res,req.body,{
            nome: 'required|string'
        });

        var qry = {
            sqlInputs:[
                {name:'desc_cargo',type:'string',value:'TESTE'},
                {name:'data',type:'date',value:'2000-10-08'}
            ],
            sqlQry:`
                select * from tb_cargos
                where desc_cargo like "%@desc_cargo%"
                and cast(dt_criacao as date) >= @data;     
            `
        };

        let result = await execSQLQuery(qry);

        res.json(result);
        
    });

    router.post('/selectTeste', async (req, res) => {
        
        var args = await validator.init(res,req.body,{
            nome: 'required|string'
        });

        var qry = {
            sqlInputs:[
                {name:'nome',type:'array_string',value:JSON.parse(args.nome)},
                {name:'data',type:'date',value:'2020-10-08'}
            ],
            sqlQry:`\
                BEGIN;
                    insert into master.tb_teste(nome) values('TRANSACTION PROD');

                    select * from master.tb_teste
                    where nome in(@nome)
                    and  '2020-10-08' = @data;
                COMMIT;
            `
        };

        let result = await execSQLQuery(qry);

        res.json(result);
        
    });

    router.post('/insertTeste', async (req, res) => {

        var args = await validator.init(res,req.body,{
            nome: 'required|string'
        });

        var qry = {
            sqlInputs:[
                {name:'nome',type:'string',value:args.nome},
            ],
            sqlQry:`\
                insert into master.tb_teste(nome)
                values(
                    @nome
                )
                RETURNING id
            `
        };

        let result = await execSQLQuery(qry);

        res.json(result);
        
        
    });

    router.post('/updateTeste', async (req, res) => {

        var args = await validator.init(res,req.body,{
            id: 'required|integer',
            nome: 'required|string'
        });

        var qry = {
            sqlInputs:[
                {name:'id',type:'number',value:args.id},
                {name:'nome',type:'string',value:args.nome},
            ],
            sqlQry:`\
                update master.tb_teste
                set nome = @nome
                where id = @id
                RETURNING id
            `
        };

        let result = await execSQLQuery(qry);

        res.json(result);
        
        
    });

    router.post('/deleteTeste', async (req, res) => {

        var args = await validator.init(res,req.body,{
            id: 'required|integer'
        });

        var qry = {
            sqlInputs:[
                {name:'id',type:'number',value:args.id}
            ],
            sqlQry:`\
                delete from master.tb_teste
                where id = @id
            `
        };

        let result = await execSQLQuery(qry);

        res.json(result);
        
        
    });


    router.post('/execProcPG', async (req, res) => {

        var qry = {
            sqlInputs:[
                {name:'id',type:'number',value:2}
            ],
            sqlQry:`
                select * from master.teste(@id)
            `        
        };

        let result = await execSQLQuery(qry);

        res.json(result);
        
        
    });

    
    router.get('/cmd', (req, res) => {

        helpers.cmdRun([
            `node --version`,
            `npm --version`
        ]).then(function(resp){
            res.json({
                retorno:true,
                data:resp
            }) 
        })
        
        
    });
    
    router.post('/uploadFileS3',timeout('1s'), upload.single('file'), async (req, res) => {

        var args = await validator.init(res,req.body,{
            name_bucket: 'required|string',
            job_id: 'required|string',
            user_id: 'required|string'
        });

        //Nome no arquivo sem a extensão
        var fileName = args.job_id+'_'+args.user_id+'_'+helpers.dateFormat.now('datetimeFull',false).replace(' ','');

        helpers.uploadS3(req,fileName,args.name_bucket).then(
            (result)=>{
                if(!req.timedout)
                    res.json({
                        retorno:true,
                        message: 'File uploaded successfully',
                        filename: result.fileName, 
                        location: result.data.Location
                    });
            }
        ).catch(
            (err)=>{
                if(!req.timedout)
                    res.json({
                        retorno:false,
                        message: err.error
                    });
            }
        )
          
    });

    router.post('/uploadFileS3Base64',async (req, res) => {

        var args = await validator.init(res,req.body,{
            file_base64:'required|string',
            name_bucket: 'required|string',
            job_id: 'required|string',
            user_id: 'required|string'
        });

        //Nome no arquivo sem a extensão
        var fileName = args.job_id+'_'+args.user_id+'_'+helpers.dateFormat.now('datetimeFull',false).replace(' ','');
        
        helpers.uploadS3(req,fileName,args.name_bucket,args.file_base64).then(
            (result)=>{

                res.json({
                    retorno:true,
                    message: 'File uploaded successfully',
                    filename: result.fileName, 
                    location: result.data.Location
                });
            }
        ).catch(
            (err)=>{
                res.json({
                    retorno:false,
                    message: err.error
                });
            }
        )
          
    });

    router.post('/createBucketS3', async (req, res) => {

        var args = await validator.init(res,req.body,{
            name_bucket: 'required|string'
        });

        helpers.createBucketS3(args.name_bucket).then(
            (result)=>{
                console.log('createBucketS3=>',result)
                res.json(result);
            }
        ).catch(
            (err)=>{
                res.json({
                    retorno:false,
                    message: err.error
                });
            }
        )
          
    });

    router.post('/deleteBucketS3', async (req, res) => {

        var args = await validator.init(res,req.body,{
            name_bucket: 'required|string'
        });

        //Só deleta Bucket que está vazio
        helpers.deleteBucketS3(args.name_bucket).then(
            (result)=>{
                res.json(result);
            }
        ).catch(
            (err)=>{
                res.json({
                    retorno:false,
                    message: err.error
                });
            }
        )
          
    });

    router.post('/copyToS3', async (req, res) => {

        var args = await validator.init(res,req.body,{
            name_bucket: 'required|string'
        });

        //VERIFICAR UMA FORMA DE NÃO DEIXAR AS SENHAS EXPOSTAS NA EXPORTAÇÃO NO CASO DE UM ERRO
        var directoryTo = path.resolve('./src/assets/downloads')+"/export_teste1.csv";
        var bucketPath = 's3://'+args.name_bucket+'/export_teste1.csv'
        var sintaxeSudo = process.env.NODE_ENV == 'developement' ? '' : 'sudo ';
        var sintaxeInicial = process.env.NODE_ENV == 'developement' ? '' : "sudo PGPASSWORD='"+config.config_db_pg.password+"' ";
        //`aws s3 mv `+directoryTo+` `+bucketPath

        helpers.cmdRun([
            sintaxeInicial+`psql -h `+config.config_db_pg.host+` -d Projeto_iFinance_01 -U ipdv -p 5432 -c "\\copy (select * from master.tb_teste) TO '`+directoryTo+`' WITH DELIMITER ';' CSV HEADER;"`,
            sintaxeSudo+`aws s3 mv `+directoryTo+` `+bucketPath
        ]).then(function(resp){
            res.json({
                retorno:true,
                directoryTo:directoryTo,
                data:resp
            }) 
        })

        
    });

    router.get('/sendEmail', (req, res) => {

        helpers.sendEmail({
            to:'leticia@ipdvonline.com.br',
            from:'senha_ifinance@ipdvonline.com.br',
            subject:'Testando o package nodemailer',
            html:`
                <h1>Olá Mundo</h1>
                <br><br>

                <ul>
                    <li>Item 1</li>
                    <li>Item 2</li>
                </ul>

            `,
            attachments: [{ // Basta incluir esta chave e listar os anexos
                filename: '1223_1_2020200313162246033.pdf', // O nome que aparecerá nos anexos
                path: 'https://teste-ifin01.s3.amazonaws.com/1223_1_2020200313162246033.pdf' // O arquivo será lido neste local ao ser enviado
            }]
        }).then(function(result){
            res.json(result) 
        })

        
    });

    router.get('/pgQrySimples', (req, res) => {

        var qry = {
            dataBase:'Projeto_iFinance_02',
            sqlInputs:[],
            sqlQry:`\
                SELECT
                    l.razao_social,
                    p.ruptura as resposta
                FROM tb_pesquisas_ruptura_preco p
                LEFT JOIN tb_lojas l on  p.id_loja = l.id_loja
                WHERE p.dt_input between '2018-03-01' and '2018-03-09';
            `
        };

        execSQLQuery(
            qry,
            function(result){

                res.json(result) 
            }
        )
        
    });

};