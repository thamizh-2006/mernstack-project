const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/assignments
// @desc    Get all assignments (admin gets all, students get their own)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let query;

        // If user is student, only show their assignments
        if (req.user.role === 'student') {
            query = Assignment.find({ createdBy: req.user._id });
        } else {
            // Admin can see all assignments
            query = Assignment.find();
        }

        const assignments = await query
            .populate('subject', 'name code color')
            .populate('createdBy', 'name email')
            .sort({ dueDate: 1 });

        res.status(200).json({
            success: true,
            count: assignments.length,
            data: assignments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/assignments/overdue
// @desc    Get overdue assignments
// @access  Private
router.get('/overdue', protect, async (req, res) => {
    try {
        let query;

        // If user is student, only show their overdue assignments
        if (req.user.role === 'student') {
            query = Assignment.find({
                createdBy: req.user._id,
                dueDate: { $lt: new Date() },
                status: { $ne: 'completed' }
            });
        } else {
            // Admin can see all overdue assignments
            query = Assignment.find({
                dueDate: { $lt: new Date() },
                status: { $ne: 'completed' }
            });
        }

        const assignments = await query
            .populate('subject', 'name code color')
            .populate('createdBy', 'name email')
            .sort({ dueDate: 1 });

        res.status(200).json({
            success: true,
            count: assignments.length,
            data: assignments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/assignments/:id
// @desc    Get single assignment
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('subject', 'name code color')
            .populate('createdBy', 'name email');

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        // Students can only view their own assignments
        if (req.user.role === 'student' && assignment.createdBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this assignment'
            });
        }

        res.status(200).json({
            success: true,
            data: assignment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/assignments
// @desc    Create new assignment
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        // Add user to req.body
        req.body.createdBy = req.user._id;

        const assignment = await Assignment.create(req.body);

        const populatedAssignment = await Assignment.findById(assignment._id)
            .populate('subject', 'name code color')
            .populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            data: populatedAssignment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PUT /api/assignments/:id
// @desc    Update assignment
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        let assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        // Students can only update their own assignments
        if (req.user.role === 'student' && assignment.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this assignment'
            });
        }

        assignment = await Assignment.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        )
            .populate('subject', 'name code color')
            .populate('createdBy', 'name email');

        res.status(200).json({
            success: true,
            data: assignment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const assignment = await Assignment.findByIdAndDelete(req.params.id);

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
