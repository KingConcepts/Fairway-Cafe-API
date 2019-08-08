import * as express from 'express';
import * as mongoose from 'mongoose';

import RequestBase from '../../response/response.controller';
import itemModel from './item.model';
import subcategoryModel from './../subcategory/subcategory.model';
import categoryModel from './../category/category.model';
import authMiddleware from '../../middleware/auth.middleware';
import {
  IResponse,
  IItemData
} from '../../interfaces/response.interface';

class ItemController extends RequestBase {
  public path = '/api/menu';
  public router = express.Router();

  constructor() {
    super();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/item/:id`, authMiddleware, this.getItem);
  }

  private getItem = async (req: express.Request, res: express.Response) => {
    try {
      let resData: IItemData;

      const item = await itemModel.findOne({_id: req.params.id});
      const subcategory = await subcategoryModel.findOne({_id: mongoose.Types.ObjectId(item.subcategoryId)});
      const category = await categoryModel.findOne({_id: subcategory.categoryId});
      
      item.imageURL = item.imageURL ? `${process.env.IMAGE_LOCATION}${item.imageURL}` : process.env.DEFAULT_IMAGE;
      subcategory.imageURL = subcategory.imageURL ? `${process.env.IMAGE_LOCATION}${subcategory.imageURL}` : process.env.DEFAULT_IMAGE;
      category.imageURL = category.imageURL ? `${process.env.IMAGE_LOCATION}${category.imageURL}` : process.env.DEFAULT_IMAGE;
      
      resData = {
        ...item._doc,
        subcategory,
        category
      };
      
      const resObj: IResponse = {
        res: res,
        status: 200,
        message: 'Item Loaded Successfully',
        data: resData
      }
      this.send(resObj);
    } catch (e) {
      console.log('getItem', e);
      this.sendServerError(res, e.message);
    }

  }
}

export default ItemController;