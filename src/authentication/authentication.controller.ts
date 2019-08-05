import * as express from 'express';
// import NotAuthorizedException from '../exceptions/NotAuthorizedException';
// import RequestWithUser from '../interfaces/requestWithUser.interface';
// import authMiddleware from '../middleware/auth.middleware';
// import postModel from '../post/post.model';
import userTokenModel from './userToken.model';
import userModel from '../user/user.model';
import bycryptOprations from '../utils/bcryptOperations';
import authentication from '../utils/authentication';
import RequestBase from '../response/response.controller';
import {
  IUserData,
  IResponse
} from '../interfaces/response.interface'

class Authentication extends RequestBase {
  public path = '/users';
  public router = express.Router();
  // private post = postModel;

  constructor() {
    super();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`/signup`, this.registration);
    this.router.post(`/login`, this.login);
  }

  private registration = async (req: express.Request, res: express.Response) => {
    try {
      const getQueryParams = { email: req.body.email, empNumber: req.body.empCode };
      const userDetails = {
        'companyCode2': 1,
        'status': 1,
        'empCode': 1,
        'email': 1,
        'firstName': 1,
        'lastName': 1,
        'isRegistered': 1
      }
      const user = await userModel.findOne(getQueryParams, userDetails);
      console.log(user);
      if (user.isRegistered) {
        return this.sendBadRequest(res, 'User Already Registered');
      }
      const userDupCheck = await userModel.find({username: req.body.username});
      if (userDupCheck.length) {
        return this.sendBadRequest(res, 'Username already taken, Please choose another username');
      }
      if ((user.companyCode2 === 'CGC' || user.companyCode2 === 'CGI' || user.companyCode2 === 'CGS')
        && (user.status === '3')) {
        const updateParams = {
          isRegistered: true,
          password: await bycryptOprations.genratePasswordHash(req.body.password),
          username: req.body.username
        }
        await userModel.updateOne({ _id: user._id }, updateParams);
        const token = await authentication.genratetoken(user._id);
        const insertUpdateQuery = {
          token,
          status: 'Active',
          userId: user._id
        };
        await userTokenModel.findOneAndUpdate({ _id: user._id }, insertUpdateQuery, { upsert: true, new: true });
        delete user._doc.status;
        delete user._doc.isRegistered;
        const resData: IUserData = {
          ...user._doc,
          token,
          username: req.body.username,
          company: user._doc.email
        };
        const resObj: IResponse = {
          res: res,
          status: 201,
          message: 'User Registered Successfully',
          data: resData
        }
        this.send(resObj);
      } else {
        this.sendBadRequest(res, 'Invalid user details');
      }
    } catch (e) {
      console.log('registration', e);
      this.sendServerError(res, e.message);
    }
  }

  private login = async (req: express.Request, res: express.Response) => {
    try {
      const getQueryParams = { email: req.body.email, isRegistered: true };
      const userDetails = {
        'password': 1,
        'companyCode2': 1,
        'status': 1,
        'empCode': 1,
        'email': 1,
        'firstName': 1,
        'lastName': 1,
        'username': 1
      }
      const user = await userModel.findOne(getQueryParams, userDetails);
      if (!user) {
        this.sendNotAuthorized(res);
      }
      if ((user.companyCode2 === 'CGC' || user.companyCode2 === 'CGI' || user.companyCode2 === 'CGS')
        && (user.status === '3')) {
        const isPasswordMatched = await bycryptOprations.comparePassword(req.body.password, user.password);
        if (isPasswordMatched) {
          const token = await authentication.genratetoken(user._id);
          const insertUpdateQuery = {
            token,
            status: 'Active',
            userId: user._id
          };
          await userTokenModel.findOneAndUpdate({ _id: user._id }, insertUpdateQuery, { upsert: true, new: true });
          delete user._doc.status;
          delete user._doc.password;
          const resData: IUserData = {
            ...user._doc,
            token,
            company: user._doc.email
          };
          const resObj: IResponse = {
            res: res,
            status: 200,
            message: 'Loggedin Successfully',
            data: resData
          }
          this.send(resObj);
        } else {
          this.sendNotAuthorized(res);
        }
      } else {
        this.sendBadRequest(res, 'Invalid user details');
      }

    } catch (e) {
      console.log('login', e);
      this.sendServerError(res, e.message);
    }
  }
}

export default Authentication;
