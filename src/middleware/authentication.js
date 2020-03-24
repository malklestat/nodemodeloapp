'use strict';

const jwt           = require('jsonwebtoken');
const config        = require('../config/default');
const helpers       = require('../services/helpers');
const modelLogin    = require('../models/login');
const getHandler    = require('./errorHandler');

//Validador de requisições
const authUser = {};

const _verifyJWT = (token,jwt_secret_token) =>{
    const promise = new Promise( (resolve) => { 
        jwt.verify(token, config.jwt_secret_token, function(err, decoded) {
            if(err) {
                resolve({retorno:false,erro:err});
            }else{
                resolve({retorno:true,decoded:decoded});
            }
        });
    });

    return promise;

}

authUser.simultaneousAccess =  (access_key,jwt_access_key) => {

    if(access_key != jwt_access_key){
        return {
            statusCode: 203,
            data:[{status_id:0}],
            msg:'Simultaneous access!'
        }
    }

    return {statusCode: 200};
};

authUser.userStatus= async (jwt_user_id) => {

    let result = await modelLogin.qryLogin('','',jwt_user_id);

    //Retorno de erro no login
    if(!result.retorno){
        result.statusCode = 500;
        return result;
    }
    else{
        //Retorno de usuário não localizado
        if(result.data.length == 0) { 
            result.statusCode = 404;
            result.msg = 'User not found!'
            return result; 
        }

        //Se o usuário estiver com o status ATIVO, não expirada e não bloqueada 
        if(
            result.data[0].status_id == 1 && 
            !result.data[0].flag_expiry && 
            !result.data[0].flag_locked_password
        ){

            result.statusCode = 200;
            result.msg = 'Usuário autênticado';
            return result; 

        }else{
            /* 
                Retorna todas as demais informações para serem tratados no front-end :
                    - Tratar os demais status do usuário, caso precise (Férias, Folga,Afastamento e etc..);
                    - Tratar o retorno de senha expirou
            */
            result.data[0].user_id = undefined;
            result.data[0].login_id = undefined;
            //result.data[0].access_key = undefined;
            result.msg = 'Non-Authoritative Information';
            result.statusCode = 203;
            return result; 
        }
    }
};

authUser.updateJWT = (decoded,payLoad,token) =>{

    let validaUpdateToken = helpers.dateFormat.diff(decoded.jwt_dt_expire,helpers.dateFormat.now('datetime',false));

    console.log('validaUpdateToken tempo=>',validaUpdateToken.seconds)

    //Valida se a data de expiração do Token já chegou no tempo limite para atualização
    if(validaUpdateToken.seconds <= config.jwt_seconds_limit_update ){

        token = jwt.sign(payLoad, config.jwt_secret_token, {
            expiresIn:  config.jwt_seconds_token_expire
        });
    }

    return token;

};

authUser.erroJWT= (err,token) => {

    let msg = '';
    let dt_expire = '';

    switch(err.message){
        case 'jwt expired': //Token expirado
            let decodedPayLoad = jwt.decode(token);
            dt_expire = decodedPayLoad.dt_expire;
            msg = 'Token expirado dia '+helpers.dateFormat.convertData(decodedPayLoad.dt_expire,true)
        break;
        case 'Token inválido': //Token inválido
            msg = 'Token expirado'
        break;
    }

    return { 
        auth: false, 
        message: msg,
        erro: err,
        dt_expire:dt_expire,
        dt_atual: helpers.dateFormat.now('datetime',false)  
    };

};

authUser.validation = async (req, res, next) => {
    try {

        var urlNotValidation = [
            '/setlogin',
            '/getLastPassword',
            '/insertPassword',
            '/requestNewPassword'
        ];
        var token = req.headers['x-access-token'];
        var isUrlNotValidation = urlNotValidation.filter((e)=> e == req.url).length > 0;

        //next();
        //return false;

        if (!token && !isUrlNotValidation) return res.status(401).json({ auth: false, message: 'Nenhum Token fornecido' });
    
        if(isUrlNotValidation) {
            next();
        }else{
            let verifyJWT = await _verifyJWT(token, config.jwt_secret_token);
                
            //1) Verifica se ocorreu algum erro de verificação do token
            if(!verifyJWT.retorno) return res.status(500).send(authUser.erroJWT(verifyJWT.erro,token));
            let decoded = verifyJWT.decoded;
    
            //2) Monta os dados para serem criptografados no token JWT passo 3) e para serem acrescentados no request da rota que foi chamada
            let payLoad= {
                jwt_user_id: decoded.jwt_user_id,
                jwt_job_id: decoded.jwt_job_id,
                jwt_access_key: decoded.jwt_access_key,
                jwt_access_key_created: decoded.jwt_access_key_created,
                jwt_dt_created: decoded.jwt_dt_created,
                jwt_dt_expire: decoded.jwt_dt_expire
    
            }
    
            /* 3) Essa função atualize o token antes de expirar (o front-end precisa fazer alguma requisição), analisando o tempo limite para alteração definido no config.jwt_seconds_limit_update, retornando o token 
                Se não quiser esta regra basta comentar  
            */
            req.token = authUser.updateJWT(decoded,payLoad,token);
            Object.assign(req, payLoad);
    
            //4) Análise o status do usuário em cada requisição.
            let resultStatusUser = await authUser.userStatus(req.jwt_user_id);
            if(resultStatusUser.statusCode != 200) return res.status(resultStatusUser.statusCode).json(resultStatusUser);
    
            //5) Análisa acesso simultâneo caso a etapa 4 retorno status 200. Se não quiser esta regra basta comentar
            let resultSimultaneousAccess  = authUser.simultaneousAccess(resultStatusUser.data[0].access_key,req.jwt_access_key);
            if(resultSimultaneousAccess.statusCode != 200) return res.status(resultSimultaneousAccess.statusCode).json(resultSimultaneousAccess);
    
            next();
    
        }
        
    } catch (error) {
        getHandler.errorHandler(error,req,res,next);
    }
    

};


module.exports = authUser;

