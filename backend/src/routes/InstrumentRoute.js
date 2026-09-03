const express = require('express');
const InstrumentsController = require('../controllers/InstrumentsController.js');
const verifyToken = require('../middlewares/Authmiddleware.js');
const uploadSds = require('../middlewares/uploadMiddleware.js');

const router = express.Router();

router.get('/', verifyToken, InstrumentsController.getAllInstruments);
router.get('/public', InstrumentsController.getPublicInstruments);
router.post('/add', [verifyToken, uploadSds], InstrumentsController.addInstrument);
router.put('/:id', [verifyToken, uploadSds], InstrumentsController.updateInstrument);
router.get('/:id', InstrumentsController.getInstrumentById);
router.delete('/:id', verifyToken, InstrumentsController.softDeleteInstrument);
router.patch('/:id/reactivate', verifyToken, InstrumentsController.reactivateInstrument);

module.exports = router;