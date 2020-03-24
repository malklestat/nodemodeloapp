'use strict';

const config        = require('../config/default');
const helpers       = require('../services/helpers');
const execSQLQuery  = require('../services/sql-qry');

const modelLogin = {} ;


modelLogin.qryLogin = async (user=String,password=String,user_id=0) => {


    let qry = {
        sqlInputs:[
            {name:'user_id',type:'number',value:user_id},
            {name:'user',type:'string',value:user},
            {name:'password',type:'string',value:password}
            
        ],
        sqlQry:`\
            select
                l.login_id,
                u.name,
                u.user_id,
                u.email,
                u.status_id,
                us.status,
                to_char(l.dt_expiry,'DD/MM/YYYY') as dt_expiry,
                case when l.password = UPPER(@password) then true else false end as validated_password,
                case when l.dt_expiry <= date(now()) then true else false end as flag_expiry,
                l.flag_locked_password,
                l.incorrect_password_number,
                count(distinct s.sector_id) qtd_setores,
                (
                    select 
                        access_key 
                    from master.tb_access_log 
                    where user_id = u.user_id
                    order by dt_created desc
                    limit 1
                ) as access_key
            from master.tb_logins l
            inner join master.tb_users u on u.user_id = l.user_id
            inner join master.tb_users_status us on us.status_id = u.status_id
            left join master.tb_users_sectors s on s.user_id = u.user_id
            where 
                l.dt_modify is null and
                (u.login = @user or u.user_id = @user_id)        
            
            group by 
                l.login_id,
                u.name,
                u.user_id,
                u.email,
                u.status_id,
                us.status,
                l.dt_expiry,
                l.flag_locked_password,
                l.password,
                l.incorrect_password_number
        `
    };

    return await execSQLQuery(qry);
}

modelLogin.lastPassword = async (user_id=Number,limit=Number) => {

    let qry = {
        sqlInputs:[
            {name:'user_id',type:'string',value:user_id},
            {name:'limit',type:'number',value:limit}
        ],
        sqlQry:`\
            select
                l.password,
                to_char(l.dt_created,'YYYY-MM-DD HH24:mm:ss.ms') as dt_created
            from master.tb_logins l
            where 
                l.user_id = @user_id   
            order by dt_created desc  
            limit @limit             

        `
    };

    return await execSQLQuery(qry);
}

modelLogin.updateLockedPassword = async (login_id=Number,number_increment=Number,incorrect_password_limit=Number) => {
    let qry = {
        sqlInputs:[
            {name:'login_id',type:'number',value:login_id},
            {name:'number_increment',type:'number',value:number_increment},
            {name:'incorrect_password_limit',type:'number',value:incorrect_password_limit}
        ],
        sqlQry:`\
            update master.tb_logins
            set 
                incorrect_password_number = (case when @number_increment = 0 then 0 else incorrect_password_number + @number_increment end),
                flag_locked_password = (
                    case 
                        when @number_increment = 0 then false
                        when @number_increment > 0 and (incorrect_password_number + @number_increment) >= @incorrect_password_limit then true 
                        else flag_locked_password 
                    end
                )
            where login_id = @login_id 
            RETURNING 
                incorrect_password_number,flag_locked_password
        `
    };

    return await execSQLQuery(qry);
}

modelLogin.insertPassword = async (user_id=Number,password=String,expiry_now=false) => {


    let qry = [
        {
            sqlInputs:[
                {name:'user_id',type:'number',value:user_id}
            ],
            sqlQry:`\
                update master.tb_logins
                set 
                    dt_modify = now()
                where 
                    user_id = @user_id and
                    dt_modify is null; 
            `
        },
        {
            sqlInputs:[
                {name:'user_id',type:'number',value:user_id},
                {name:'password',type:'number',value:password},
                {name:'is_expiry',type:'number',value:(expiry_now ? 1 : 0) },
            ],
            sqlQry:`\
                
                    insert into master.tb_logins
                    (
                        user_id,
                        password,
                        flag_locked_password,
                        dt_expiry,
                        user_id_owner
                    )
                    select 
                        @user_id,
                        @password,
                        false,
                        (
                            case 
                                when @is_expiry = 1 then CURRENT_DATE
                                when @is_expiry = 0 and u.days_expire_password is not null then CURRENT_DATE + u.days_expire_password * INTERVAL '1 day'
                                else null
                            end
                        ),
                        1
                    from master.tb_users u;
                
                
            `
        }
    ];

    let resultQry1 = await execSQLQuery(qry[0]);

    if(resultQry1.rowCount > 0){
        return await execSQLQuery(qry[1]);
    }else{
        return {retorno:false,resultQry1:resultQry1};
    }

    
}


module.exports = modelLogin;

