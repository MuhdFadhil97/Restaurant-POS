import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  res.json(await service.listCustomers(search));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getCustomer(req.params.id));
});

export const history = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getCustomerHistory(req.params.id));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createCustomer(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateCustomer(req.params.id, req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteCustomer(req.params.id);
  res.status(204).send();
});
