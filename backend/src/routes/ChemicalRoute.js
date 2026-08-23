const express = require('express');
const ChemicalController = require('../controllers/ChemicalController.js');
const verifyToken = require('../middlewares/Authmiddleware.js');
const uploadSds = require('../middlewares/uploadMiddleware.js');

const router = express.Router();

// Route to get dashboard stats
router.get('/stats', verifyToken, ChemicalController.getChemicalStats);

// Route to get all chemicals
router.get('/', verifyToken, ChemicalController.getAllChemicals);

// Public route to get a selection of chemicals for the homepage
router.get('/public', ChemicalController.getPublicChemicals);

// Route to get the next auto-generated chemical code
router.get('/get-next-code', verifyToken, ChemicalController.getNextChemicalCode);

// Route to get all inactive (soft-deleted) chemicals
router.get('/inactive', verifyToken, ChemicalController.getInactiveChemicals);

// Route to look up chemical data from PubChem by CAS number
router.get('/lookup/cas/:casNumber', verifyToken, ChemicalController.getChemicalDataByCas);

// Route to get all chemicals that have an SDS document
router.get('/with-sds', verifyToken, ChemicalController.getChemicalsWithSds);

// Route to add a new chemical
router.post('/add-chemical', [verifyToken, uploadSds], ChemicalController.addChemical);

// Route to update a chemical
router.put('/:id', [verifyToken, uploadSds], ChemicalController.updateChemical);

// Route to get a single chemical by ID
router.get('/:id', ChemicalController.getChemicalById);

// Route to soft-delete (deactivate) a chemical
router.delete('/:id', verifyToken, ChemicalController.softDeleteChemical);

// Route to reactivate a chemical
router.patch('/:id/reactivate', verifyToken, ChemicalController.reactivateChemical);

module.exports = router;