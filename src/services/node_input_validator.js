'use strict';

const Promise       = require('bluebird');
const { Validator } = require('node-input-validator');

module.exports = {
    init:  (res,request=Object,args={}) =>{
        
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







