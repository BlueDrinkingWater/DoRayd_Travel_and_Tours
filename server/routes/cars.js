import express from 'express';
import { getAllCars, createCar, updateCar, archiveCar, unarchiveCar, getCarById } from '../controllers/carsController.js';
import { auth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();

router.route('/')
    .get(getAllCars)
    .post(auth, checkPermission('cars', 'write'), createCar);

router.route('/:id')
    .get(getCarById) 
    .put(auth, checkPermission('cars', 'write'), updateCar);

router.route('/:id/archive')
    .patch(auth, checkPermission('cars', 'full'), archiveCar);

router.route('/:id/unarchive')
    .patch(auth, checkPermission('cars', 'full'), unarchiveCar);

export default router;