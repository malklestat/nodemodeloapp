'use strict';

const config        = require('../config/default');
const helpers       = require('../services/helpers');
const jwt           = require('jsonwebtoken');
const modelAcessos  = require('../models/acessos');
const modelLogin    = require('../models/login');
const execSQLQuery  = require('../services/sql-qry');

const ctrlLogin = {} ;

ctrlLogin.setLoginJwt = async (result) => {

    //Zera o contador de tentativas de senha incorreta e o flag de bloqueio
    let updateResult = await modelLogin.updateLockedPassword(result.data[0].login_id,0,0);

    //Insere o registro de acesso de Login 
    let resultAccessLog = await modelAcessos.insertAccessLog(result.data[0].user_id,1);

    if(!resultAccessLog.retorno) { return resultAccessLog; }
    if(!updateResult.retorno) { return updateResult; }

    //Configura os dados que serão armazenados no token JWT para ser utilizado na aplicação
    let payLoad= {
        jwt_user_id: result.data[0].user_id,
        jwt_job_id:0,
        jwt_access_key: resultAccessLog.data[0].access_key,
        jwt_access_key_created: resultAccessLog.data[0].dt_created,
        jwt_dt_created: helpers.dateFormat.now('datetime',false),
        jwt_dt_expire: helpers.dateFormat.add(config.jwt_seconds_token_expire,'seconds')

    }

    let token = jwt.sign(payLoad, config.jwt_secret_token, {
        expiresIn:  parseInt(config.jwt_seconds_token_expire)
    });

    return {retorno:true,token:token};

}

ctrlLogin.setlogin = async (user=String,password=String) => {

    var result = await modelLogin.qryLogin(user,password);
    var json = {retorno:null,msg:''};

    //Retorno de erro no login
    if(!result.retorno){
        console.log(result);
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

        //Usuário com senha incorreta, atualiza o número de tentativas e retorna com os dados atualizados
        if(!result.data[0].validated_password){
            let updateResult = await modelLogin.updateLockedPassword(result.data[0].login_id,1,3);
            
            switch(updateResult.retorno){
                case false:
                    updateResult.statusCode = 500;
                    updateResult.msg='Error updateLockedPassword';
                    return updateResult;
                break; 
                default:
                    let updateData = updateResult.rowCount > 0 ? updateResult.data[0] : updateResult;

                    result.data =[{
                        validated_password:false,
                        incorrect_password_number: updateData.incorrect_password_number,
                        flag_locked_password: updateData.flag_locked_password
                    }];
                    result.statusCode = 404;
                    result.msg = 'Incorrect password!';
                    return result;
                break;  
            }

        }

        //Se o usuário estiver com o status ATIVO, senha validada, n�o expirada e n�o bloqueada 
        if(
            result.data[0].status_id == 1 && 
            result.data[0].validated_password &&
            !result.data[0].flag_expiry && 
            !result.data[0].flag_locked_password
        ){

            let resultSetLoginJWT = await ctrlLogin.setLoginJwt(result);
            resultSetLoginJWT.statusCode = 200;
            resultSetLoginJWT.data = [{
                name:result.data[0].name,
                qtd_setores: result.data[0].qtd_setores
            }];
            return resultSetLoginJWT;

        }else{
            /* 
                Retorna todas as demais informações para serem tratados no front-end :
                    - Tratar os demais status do usuário, caso precise (Férias, Folga,Afastamento e etc..);
                    - Tratar o retorno de senha expirou
            */

            result.data[0].user_id = undefined;
            result.data[0].login_id = undefined;
            result.data[0].access_key = undefined;
            result.msg = 'Non-Authoritative Information';
            result.statusCode = 203;
            return result; 
        }
    }

}

ctrlLogin.getLastPassword = async (user,password_current) => {

    var getLogin = await modelLogin.qryLogin(user,password_current);
    var getLastPassword = {}

    if(getLogin.retorno){
        getLastPassword = await modelLogin.lastPassword(getLogin.data[0].user_id,6);
        getLastPassword.statusCode = 200;

        return getLastPassword;
    }else{
        getLastPassword.statusCode = 500;
        return getLastPassword;
    }
 
};

ctrlLogin.insertPassword = async (user=String,password_current=String,password_new=String,expiry_now=false) => {
        
    var getLogin = await modelLogin.qryLogin(user,password_current);

    if(!getLogin.retorno) {
        getLogin.statusCode = 500;
        return getLogin;
    }

    if(getLogin.data.length == 0){
        return {
            statusCode:404,
            retorno:false,
            msg:'User not found!'
        };
    }

    if(!getLogin.data[0].validated_password && !expiry_now){
        return {
            statusCode:401,
            retorno:false,
            msg:'Incorrect password!'
        }

    }else{
        let resulInsertPassword = await modelLogin.insertPassword(getLogin.data[0].user_id,password_new,expiry_now);

        if(!resulInsertPassword.retorno){
            resulInsertPassword.statusCode = 500;
            return resulInsertPassword;
        }

        let resultSetLoginJWT = await ctrlLogin.setLoginJwt(getLogin);
        resultSetLoginJWT.statusCode = 200; 

        if(expiry_now){
            resultSetLoginJWT.user_name = getLogin.data[0].name;
            resultSetLoginJWT.email = getLogin.data[0].email;
        }else{
            resultSetLoginJWT.data = [{
                name:getLogin.data[0].name,
                qtd_setores: getLogin.data[0].qtd_setores
            }];
        }
        
        return resultSetLoginJWT;

    }


};

ctrlLogin.requestNewPassword = async (user=String) => {
        
    let generator = require('generate-password');

    let passwordGenerator = generator.generate({
        length: 6,
        numbers: true,
        symbols:false,
        lowercase:true,
        uppercase:true

    });

    let passwordSha256 = helpers.sha256(passwordGenerator);
    let result = await ctrlLogin.insertPassword(user,null,passwordSha256,true);

    //console.log('result =>',result)

    if(result.statusCode == 200){
        console.log('entrou aqui');
        let sendEmail = await helpers.sendEmail({
            to: result.email,
            from:'senha_ifinance@ipdvonline.com.br',
            subject:'Solitação de senha',
            html:`

            <b>Olá `+result.user_name+`</b>
            <br><br>
            Conforme solicitado, o sistema gerou uma senha temporária, segue os dados abaixo:
            <br><br>
            <ul>
                <li>Login: `+user+`</li>
                <li>Senha: <b>`+passwordGenerator+`</b></li>
            </ul>                   
            
            <br>
            
            Ao se logar, o sistema irá obrigar a criar uma nova senha.            
            
            E-mail automático, favor não responder!<br><br>
            Data da solicitação:`+helpers.dateFormat.now('datetime',true)+` .

            `
        });

        sendEmail.statusCode = (sendEmail.reetorno ? 200 : 500); 

        return sendEmail;
    }else{
        return result;
    }

};


module.exports = ctrlLogin;

