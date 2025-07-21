"use strict";
import { Request, Response, NextFunction } from "express";

//need to check this and then write the tests
const validateCommitPayload = function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  //do somthing
  next();
};

export default validateCommitPayload;
