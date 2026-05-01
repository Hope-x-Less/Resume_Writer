import { Router } from "express";
import { validateGenerateInput } from "../middleware/validate.js";
import { generateController } from "../controllers/generateController.js";

export const generateRouter = Router();

// POST /generate
generateRouter.post("/", validateGenerateInput, generateController);
