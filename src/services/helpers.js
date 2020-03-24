'use strict';

const hash          = require('hash.js');
const moment        = require('moment-timezone');
const cmd           = require('node-command-line');
const Promise       = require('bluebird');
const AWS           = require('aws-sdk');
const config        = require('../config/default');
const nodemailer    = require('nodemailer');
const { Validator } = require('node-input-validator');
//const multer        = require('multer');

var utilGeral = {
    dateFormat:{
        now:(tipo=String,padraoPtBR=false)=>{
            if(!padraoPtBR){
                var data_modelo = tipo == 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss';
            }else{
                var data_modelo = tipo == 'date' ? 'DD/MM/YYYY' : 'DD/MM/YYYY HH:mm:ss';
            }

            switch(tipo){
                case 'date':
                    var data_modelo = padraoPtBR ? 'DD/MM/YYYY':'YYYY-MM-DD';
                break;
                case 'datetime':
                    var data_modelo = padraoPtBR ? 'DD/MM/YYYY HH:mm:ss':'YYYY-MM-DD HH:mm:ss';
                break;
                case 'datetimeFull':
                    var data_modelo = padraoPtBR ? 'DD/MM/YYY HH:mm:ss.SSS':'YYYMMDD HHmmssSSS';
                break;
            }

            return moment().locale('pt-br').tz("America/Sao_Paulo").format(data_modelo);
        },
        add:(valor=Number,medida=String) =>{
            return moment().locale('pt-br').tz("America/Sao_Paulo").add(valor,medida).format('YYYY-MM-DD HH:mm:ss');
        },
        diff:(dtNow=String,dtEnd=String)=>{
            var now = moment(dtNow);
            var end = moment(dtEnd);
            var duration = moment.duration(now.diff(end));

            return {
                seconds: duration.asSeconds(),
                minutes: duration.asMinutes(),
                hour: duration.asHours(),
                days: duration.asDays(),
                month: duration.asMonths(),
                weeks: duration.asWeeks(),
                years: duration.asYears()
            }
        },
        convertData:(date=String,padraoPtBR=false)=>{

            if(!padraoPtBR){
                var data_modelo =  date.length == 10 ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss';
            }else{
                var data_modelo = date.length == 10 ? 'DD/MM/YYYY' : 'DD/MM/YYYY HH:mm:ss';
            }

            return moment(date).locale('pt-br').tz("America/Sao_Paulo").format(data_modelo);

        }
    },
    //Criptografia sha256
    sha256: (message)=>{
        return hash.sha256().update(message).digest('hex').toUpperCase();
    },
    cmdRun: async (sintaxes=[])=>{

        var result = {success:[],error:[]};

        var processo = await Promise.coroutine(function *() {
            for(var i=0; i < sintaxes.length; i++) {
                var response = yield cmd.run(sintaxes[i]);

                if(response.success) {
                    result.success.push(response.message);
                    // do something
                    // if success get stdout info in message. like response.message
                 }else{
                    result.error.push({erro:response.error,stderr:response.stderr});
                 }
            }

        })();

        //aws_region:config.aws_region,

        return {
            retorno: result.success.length > 0,
            data:result.success,
            erro:result.error
        };


    },
    isNumber:(valor)=>{
        return typeof valor == "number" || (typeof valor == "object" && valor.constructor === Number);
    },
    isString:(valor)=>{
        return typeof valor == "string" || (typeof valor == "object" && valor.constructor === String);
    },
    uploadS3: (req,fileName,bucketS3,base64='')=>{
        const promise = new Promise( (resolve, reject) => { 

            var s3Client = new AWS.S3({
                secretAccessKey: config.aws_secret_access,
                accessKeyId: config.aws_access_key,
                region: config.aws_region 
            });

            var objMimeType = {
                'txt':'text/plain',
                'csv':'text/csv',
                'jpg':'image/jpeg',
                'jpeg':'image/jpeg',
                'png':'image/png',
                'mp3':'audio/mpeg',
                'mpeg':'video/mpeg',
                'pdf':'application/pdf',
                'mp4':'video/mp4',
            }

            if(base64 != '') {
                var fileBody = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                var extFile = base64.split(';')[0].split('/')[1];
                var mimeType = objMimeType[extFile];
            }else{
                var extFile = req.file.originalname.split('.').pop();
                var fileBody = req.file.buffer;
                var mimeType = req.file.mimetype;
            }
              
            fileName = fileName+'.'+extFile;

            var uploadParams = {
                Bucket: bucketS3, 
                Key: fileName, // pass key
                Body: fileBody , // pass file body
                ACL: 'public-read-write',
                ContentType:mimeType
            };

            if(base64 != '') uploadParams['ContentEncoding'] = 'base64';

            s3Client.upload(uploadParams, (err, data) => {
                if (err) {
                    reject({retorno:false,error:err});
                }else{
                    resolve({retorno:true,data:data,fileName:fileName});
                }
            });

        });

        return promise;

    },
    createBucketS3: (bucket_name=String)=>{

        const promise = new Promise( (resolve, reject) => { 
            let s3Client = new AWS.S3({
                secretAccessKey: config.aws_secret_access,
                accessKeyId: config.aws_access_key,
                region: config.aws_region 
            });

            let params = {
                Bucket: bucket_name,
                ACL: "public-read-write"
            };
            
            s3Client.createBucket(params, function(err, data) {
                if (err) {
                    reject({retorno:false,error:err.stack});
                }else{

                    //console.log('createBucket=>',data)
                    let paramsACL = {
                        Bucket: bucket_name, 
                        ACL: 'public-read-write', /* private | public-read | public-read-write | authenticated-read */
                        AccessControlPolicy: {
                            Grants: [
                                {
                                    Grantee: {
                                    Type: 'CanonicalUser', /* required  CanonicalUser | AmazonCustomerByEmail | Group */
                                    ID: config.aws_access_key,
                                    URI: 'http://acs.amazonaws.com/groups/global/AllUsers'
                                    },
                                    Permission: 'FULL_CONTROL' /* FULL_CONTROL | WRITE | WRITE_ACP | READ | READ_ACP */
                                }
                            ]
                        }
                    };

                    s3Client.putBucketAcl(paramsACL,function(err2, data2){
                        if (err) {
                            console.log('err=>',err)
                            reject({retorno:false,error:err2.stack});
                        }else{
                            //console.log('data=>',data2)
                            resolve({retorno:true,data:data.Location,url:'https:/'+data.Location+'.s3.amazonaws.com/'});
                        }

                    })
                    
                }
            });
        })

        return promise;
    },
    deleteBucketS3: (bucket_name=String)=>{

        const promise = new Promise( (resolve, reject) => { 
            let s3Client = new AWS.S3({
                secretAccessKey: config.aws_secret_access,
                accessKeyId: config.aws_access_key,
                region: config.aws_region 
            });

            let params = {
                Bucket: bucket_name
            };
            
            s3Client.deleteBucket(params, function(err, data) {
                if (err) {
                    //console.log('deleteBucket=>',err)
                    reject({retorno:false,error:err.stack});
                }else{
                    //console.log('deleteBucket data=>',data)
                    resolve({retorno:true,url:'https:/'+bucket_name+'.s3.amazonaws.com/'});   
                }
            });
        })

        return promise;
    },
    sendEmail: ({to='',from='teste@ipdvonline.com.br',subject='',html='',attachments=[]})=>{

        //Biblioteca https://community.nodemailer.com/

        const promise = new Promise( (resolve, reject) => { 
            let transporte = nodemailer.createTransport({
                host: config.smtp_host,
                port: config.smtp_port,
                secure: false,
                auth: {
                  user: config.smtp_username,
                  pass: config.smtp_password
                } 
            });

            let email = {
                from: from, //Precisa ser um domÃ­nio atrelado pelo o seu servidor SMTP
                to: to,
                subject: subject,
                html: html ,
                attachments: attachments
            };


            transporte.sendMail(email, function(err,info){

                //console.log('err=>',err);
                //console.log('info=>',info);

                if(err){
                    reject({retorno:false,erro:err})
                }else{
                    resolve({
                        retorno:true,
                        response: typeof info.response != 'undefined' ? info.response:'',
                        accepted: typeof info.accepted != 'undefined' ? info.accepted:'',
                        reject: typeof info.reject != 'undefined' ? info.reject:''
                    });
                }
            });
        });

        return promise;

    },
    replaceAll:(str, find, replace)=>{
        return str.replace(new RegExp(find, 'g'), replace);
    },
    argsValidator2: (res,request=Object,args={}) =>{
        
        //Documentação acessar https://www.npmjs.com/package/node-input-validator
        
        const promise = new Promise( (resolve, reject) => { 

            var v = new Validator(request,args);

            v.check().then((matched) => {
                if (!matched) {
                    res.status(422).send(v.errors);
                    //resolve(v.errors);
                    return false;
                }else{
                    resolve(request); 
                }
            });
        });

        return promise;

    }
}

module.exports = utilGeral;

