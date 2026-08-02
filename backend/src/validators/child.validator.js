import { body } from 'express-validator'

export const createChildValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('gender').isIn(['M', 'F', 'other']).withMessage('Gender must be M, F, or other'),
  body('center').notEmpty().withMessage('Center is required'),
  body('guardian.name').trim().notEmpty().withMessage('Guardian name is required'),
]
