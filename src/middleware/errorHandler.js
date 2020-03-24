'use strict';

const requestIp = require('request-ip');

module.exports =  {
    errorHandler:(err, req, res, next)=>{
        //console.log('vald =>',req)

        if(err){
            let clientIp = requestIp.getClientIp(req); 

            res.status(500).send({
                route: req.url,
                method: req.method,
                clientIp:clientIp,
                message: err.message,
                code: err.code,
                stack: err.stack

            })

        }else{
            next();
        }

        
    }/* ,
    timeOut : timeout('5s') (time) =>{
        
        var haltOnTimedout =  => (req, res, next) =>{
            if (!req.timedout) next()
        }
    } */
}

