import * as express from 'express';
import * as mongoose from 'mongoose';

import RequestBase from '../../response/response.controller';
import subcategoryModel from './subcategory.model';
import authMiddleware from '../../middleware/auth.middleware';
import { IResponse } from '../../interfaces/response.interface';
import adminMiddleware from '../../middleware/admin.middleware';
import fileUploads from '../../utils/fileUploads';

class SubcategoryController extends RequestBase {
  public path = '/api/menu';
  public router = express.Router();

  constructor() {
    super();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:categoryId/subcategories`, authMiddleware, this.getAllSubcategoryWithItems);
    // this.router.get(`${this.path}/:categoryId/subcategories`, this.getAllSubcategoryWithItems);
    this.router.post(`${this.path}/subcategories`, authMiddleware, adminMiddleware, fileUploads.uploadFile().single('image'), this.createSubcategory);
    this.router.get(`${this.path}/subcategories/:id`, authMiddleware, this.getSubcategory);
    this.router.put(`${this.path}/subcategories/:id`, authMiddleware, adminMiddleware, fileUploads.uploadFile().single('image'), this.updateSubcategory);
  }

  private getAllSubcategoryWithItems = async (req: express.Request, res: express.Response) => {
    try {
      let queryParams: any = {};
      let result: any;

      queryParams.categoryId = mongoose.Types.ObjectId(req.params.categoryId);
      const page = req.query.page ? req.query.page : 0;
      const subcategoriesCount = await subcategoryModel.count();
      const limit = page ? Number(req.query.limit) || Number(process.env.PAGE_LIMIT) : 1000;
      const skip = page ? Number((page - 1) * limit) : 0;
      const pageCount = page ? subcategoriesCount / limit : 0;
      const totalPage = page ? (pageCount % 1 ? Math.floor(pageCount) + 1 : pageCount) : 0;
      if (!req.isAdmin) {
        queryParams.status = true;
        result = await subcategoryModel.aggregate([
          { $match: queryParams },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup:
            {
              from: 'items',
              localField: '_id',
              foreignField: 'subcategoryId',
              as: 'items',
            }
          },
          {
            $project: {
              name: 1,
              description: 1,
              status: 1,
              categoryId: 1,
              items: {
                $filter: {
                  input: "$items",
                  as: "item",
                  cond: { $eq: ["$$item.status", queryParams.status] }
                }
              }
            }
          }
        ]);
      } else {
        queryParams.categoryId = mongoose.Types.ObjectId(req.params.categoryId);
        if (req.query.keyword) {
          queryParams.name = new RegExp(`${req.query.keyword}`, 'i');
        }
        result = await subcategoryModel.aggregate([
          { $match: queryParams },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup:
            {
              from: 'items',
              localField: '_id',
              foreignField: 'subcategoryId',
              as: 'items',
            }
          }
        ]);
      }

      result.map((subcategory) => {
        subcategory.imageURL = subcategory.imageURL ? `${process.env.IMAGE_LOCATION}${subcategory.imageURL}` : process.env.DEFAULT_IMAGE;
        return subcategory.items.map((item) => {
          item.imageURL = item.imageURL ? `${process.env.IMAGE_LOCATION}${item.imageURL}` : process.env.DEFAULT_IMAGE;
        })
      });

      let subCategoryRes;

      if (!req.isAdmin) {
        subCategoryRes = result;
      } else {
        subCategoryRes = {
          subcategries: result,
          totalPage,
          subcategoriesCount,
          page: Number(page)
        }
      }
  
      const resObj: IResponse = {
        res: res,
        status: 200,
        message: 'Subcategory Loaded Successfully',
        data: subCategoryRes
      }
      this.send(resObj);
    } catch (e) {
      console.log('getAllCategory', e);
      this.sendServerError(res, e.message);
    }
  }

  private createSubcategory = async (req: express.Request, res: express.Response) => {
    try {
      if (!req.body.name) {
        return this.sendBadRequest(res, 'subCategory Name Is Required.');
      }
      const saveQueryParams = {
        name: req.body.name,
        description: req.body.description || '',
        imageURL: req.file && req.file.filename || '',
        categoryId: req.body.categoryId
      };
      const createdData = new subcategoryModel(saveQueryParams);
      const result = await createdData.save();
      const resObj: IResponse = {
        res: res,
        status: 200,
        message: 'Subcategory Added Successfully.',
        data: result
      }
      this.send(resObj);
    } catch (e) {
      console.log('createSubcategory', e);
      this.sendServerError(res, e.message);
    }
  }

  private getSubcategory = async (req: express.Request, res: express.Response) => {
    try {
      let queryParams: any = {};

      if (!req.isAdmin) {
        queryParams.status = true;
        queryParams._id = req.params.id;
      } else {
        queryParams._id = req.params.id;
      }
      const category = await subcategoryModel.findOne(queryParams);

      category.imageURL = category.imageURL ? `${process.env.IMAGE_LOCATION}${category.imageURL}` : process.env.DEFAULT_IMAGE;

      const resObj: IResponse = {
        res: res,
        status: 200,
        message: 'Subcategory Loaded Successfully',
        data: category
      }
      this.send(resObj);
    } catch (e) {
      console.log('getSubcategory', e);
      this.sendServerError(res, e.message);
    }
  }

  private updateSubcategory = async (req: express.Request, res: express.Response) => {
    try {
      const saveQueryParams = {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        imageURL: req.file && req.file.filename || '',
        categoryId: req.body.categoryId
      };
      const result = await subcategoryModel.findOneAndUpdate({ _id: req.params.id }, saveQueryParams);

      const resObj: IResponse = {
        res: res,
        status: 201,
        message: 'Subcategory updated Successfully',
        data: result
      }
      this.send(resObj);
    } catch (e) {
      console.log('updateSubcategory', e);
      this.sendServerError(res, e.message);
    }
  }

}
export default SubcategoryController;
