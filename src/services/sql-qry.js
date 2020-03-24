'use strict';

const helpers       = require('../services/helpers');
const config        = require('../config/default');
const dbActive      = config.active_db;


async function validatorParams(sqlInputs=[],sqlQry=''){
    var validQtdParams = 0;
    var matched;
    var isErro = false;

    sqlInputs.filter(function(e){ 
        validQtdParams += (sqlQry.split('@'+e.name).length > 0 ? 1 : 0);
    });

    if(validQtdParams != sqlInputs.length){
        return {retorno:false,details:'The parameter quantity does not correspond to what was reported in the SQL syntax.'};
    }

    if(sqlQry == '') {
        return {retorno:false,details:'Objeto sqlQry is empty.'};
    }


    for(var [index,param] of sqlInputs.entries()){

        if(sqlInputs.filter(function(e){ return e.name == param.name }).length > 1){
            return {retorno:false,details:'Duplicate parameter names in SQL syntax.'};
        }

        switch(param.type){
            case 'array_number':
                if( !param.value.some((i) => !helpers.isNumber(i)) ){
                    sqlQry = helpers.replaceAll(sqlQry,'@'+param.name,param.value.join());
                    matched = {retorno: true,sqlQry:sqlQry};
                }else{
                    return {retorno: false,details:'Sql value does not match the type [array_number] informing'};
                    //isErro = true;
                }
            break;
            case 'array_string':
                if( !param.value.some((i) => !helpers.isString(i)) ){
                    sqlQry = helpers.replaceAll(sqlQry,'@'+param.name,"'"+param.value.join("','")+"'");
                    matched = {retorno: true,sqlQry:sqlQry};
                }else{
                    matched = {retorno: false,details:'Sql value does not match the [array_string] type informing'};
                    isErro = true;
                }
            break;
            case 'date':
                if( !isNaN(Date.parse(param.value)) ){
                    sqlQry = helpers.replaceAll(sqlQry,'@'+param.name,"'"+helpers.dateFormat.convertData(param.value,false)+"'");
                    matched = {retorno: true,sqlQry:sqlQry};
                }else{
                    matched = {retorno: false,details:'Sql value does not match the type [date] informing'};
                    isErro = true;
                }
            break;
            case 'string':
                if( helpers.isString(param.value) ){
                    sqlQry = helpers.replaceAll(sqlQry,'"%@'+param.name+'%"',"'%"+param.value+"%'");
                    sqlQry = helpers.replaceAll(sqlQry,'"%@'+param.name+'"',"'%"+param.value+"'");
                    sqlQry = helpers.replaceAll(sqlQry,'"@'+param.name+'%"',"'"+param.value+"%'");
                    sqlQry = helpers.replaceAll(sqlQry,'@'+param.name,"'"+param.value+"'");
                    matched = {retorno: true,sqlQry:sqlQry};
                }else{
                    matched = {retorno: false,details:'Sql value does not match the type [string] informing'};
                    isErro = true;
                }
            break;
            case 'number':
                if( helpers.isNumber(param.value) ){
                    sqlQry = helpers.replaceAll(sqlQry,'@'+param.name,param.value);
                    matched = {retorno: true,sqlQry:sqlQry};
                }else{
                    matched = {retorno: false,details:'Sql value does not match the type [number] informing'};
                    isErro = true;
                }
            break;
            default:
                matched = {retorno: false,details:'Sql type ['+param.type+'] not found'};
                isErro = true;
            break;
        }

    }

    return matched;

}

async function execQueryMSSQL(req,{sqlInputs=[],sqlOutputs={},sqlQry=''}){


    try{

        var sqlValidation = await validatorParams(sqlInputs,sqlQry);

        //console.log('sqlValidation=>',sqlValidation)

        if(!sqlValidation.retorno) throw new Error(sqlValidation.details);

        if(sqlValidation.retorno){
            var result;
            //var isTransaction = false;

            result = await req.query(sqlValidation.sqlQry);
            return result;
        }
    } catch (e) {
        //if(isTransaction) await client.query('ROLLBACK')
        throw e;
    } finally {
        //if(isTransaction) client.release();
    } 
    

}

async function execQueryPG(client,{sqlInputs=[],sqlOutputs={},sqlQry=''}){
    try{
        var sqlValidation = await validatorParams(sqlInputs,sqlQry)
        var isTransaction = false;

        //console.log('sqlValidation=>',sqlValidation)
        if(!sqlValidation.retorno) throw new Error(sqlValidation.details);

        if(sqlValidation.retorno){
            var result;
        
            for(var [index,item] of sqlValidation.sqlQry.split(';').entries()){
                if(item.toUpperCase().indexOf('BEGIN') > -1) isTransaction = true;
                if(item.trim() != '' && item.toUpperCase().indexOf('COMMIT') == -1) result = await client.query(item.trim());
                if(item.toUpperCase().indexOf('COMMIT') > -1) await client.query(item.trim());
            }

            return result;
        }
    } catch (e) {
        if(isTransaction) await client.query('ROLLBACK')
        throw e
    } finally {
        if(isTransaction) client.release();
        client.end();
    } 

}

module.exports = async function execSQLQuery({dataBase='',sqlInputs=[],sqlQry=''}){

    var objParams = {
        sqlInputs:sqlInputs,
        sqlQry:sqlQry
    }
    //Se o banco a ser executado não tiver definido, o mesmo executa o que está como default no config
    if(dataBase != '') config[dbActive].database = dataBase;

    switch(dbActive){
        case 'config_db_mssql':

            const sql = require('mssql');

            try {
                
                const coon = await sql.connect(config[dbActive]);
                const req = await coon.request();
                var execResult = await execQueryMSSQL(req,objParams);

                sql.close();

                //console.log('execResult MSSQL=>',execResult);
                return {retorno:true,data:execResult.recordsets[0],rowCount:execResult.rowsAffected[0],command:null};
            } catch (err) {
                sql.close();
                return {retorno:false,error:err.stack};
            }
                        
            
        break;
        case 'config_db_pg':

            try {
                const { Client , Pool  }  = require('pg');
                const pool = new Pool(config[dbActive]);
                const client = await pool.connect();
                var execResult = await execQueryPG(client,objParams);

                return {retorno:true,data:execResult.rows,rowCount:execResult.rowCount,command:execResult.command};
            } catch (err) {
                return {retorno:false,error:err.stack};
            }


        break;

    }


}
