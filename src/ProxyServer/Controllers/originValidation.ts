"use strict";
import { Request, Response, NextFunction } from "express";

const requestOriginValidation = function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  next();
};

export default requestOriginValidation;
