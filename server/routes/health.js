// server/routes/health.js
import express from 'express';
const router = express.Router();

// A simple route that responds with a success status.
// This is used by the frontend to check if the server is online.
router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

export default router;