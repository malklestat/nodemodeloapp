'use strict';

const ctrlLogin = require('../controllers/login');


module.exports = (router,validator) => {

    router.post('/setlogin', async (req, res) => {

        var args = await validator.init(res,req.body,{
            user: 'required|string',
            password: 'required|string'
        });

        let result = await ctrlLogin.setlogin(args.user,args.password);

        res.status(result.statusCode).json(result);

    });

    router.post('/getLastPassword', async (req, res) => {

        var args = await validator.init(res,req.body,{
            user: 'required|string',
            password_current: 'required|string'
        });

        let result = await ctrlLogin.getLastPassword(args.user,args.password_current);

        res.status(result.statusCode).json(result);
   
    });

    router.post('/insertPassword', async (req, res) => {

        var args = await validator.init(res,req.body,{
            user: 'required|string',
            password_current: 'required|string',
            password_new: 'required|string'
        });

        let result = await ctrlLogin.insertPassword(args.user,args.password_current,args.password_new);

        res.status(result.statusCode).json(result);
   
    });

    router.post('/requestNewPassword', async (req, res) => {

        var args = await validator.init(res,req.body,{
            user: 'required|string'
        });

        let result = await ctrlLogin.requestNewPassword(args.user);
        res.status(result.statusCode).json(result);
   
    });

};
