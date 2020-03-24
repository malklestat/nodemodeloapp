'use strict';

const execSQLQuery  = require('../services/sql-qry');

const modelAcessos = {} ;

modelAcessos.insertAccessLog = async (user_id=Number,menu_id=Number,) => {
    let qry = {
        sqlInputs:[
            {name:'user_id',type:'number',value:user_id},
            {name:'menu_id',type:'number',value:menu_id}
        ],
        sqlQry:`\
            insert into master.tb_access_log (user_id,menu_id)
            values(
               @user_id,
               @menu_id 
            )
            RETURNING 
                access_key,
                dt_created
        `
    };

    return await execSQLQuery(qry);
}


module.exports = modelAcessos;

