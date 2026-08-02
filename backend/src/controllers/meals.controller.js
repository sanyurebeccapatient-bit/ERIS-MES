import Meal from '../models/Meal.js'
import Child from '../models/Child.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/** GET /api/meals/today */
export const getTodayMeals = asyncHandler(async (req, res) => {
  const date = req.query.date || todayStr()
  const filter = { date }

  if (['caregiver', 'field_officer'].includes(req.user.role)) {
    const children = await Child.find({ center: req.user.center, isActive: true }).select('_id')
    filter.child = { $in: children.map((c) => c._id) }
  }

  const meals = await Meal.find(filter).populate('child', 'name')
  res.json(meals)
})

/** POST /api/meals */
export const recordMeal = asyncHandler(async (req, res) => {
  const { childId, type, notes } = req.body
  if (!childId || !type) throw new AppError('childId and type are required', 400)

  const child = await Child.findById(childId)
  if (!child) throw new AppError('Child not found', 404)

  const date = todayStr()
  const meal = await Meal.findOneAndUpdate(
    { child: childId, date, type },
    { child: childId, center: child.center, recordedBy: req.user._id, date, type, recorded: true, notes },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  res.status(201).json(meal)
})
