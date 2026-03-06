const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Initial seed
exports.seedAdmin = async (req, res) => {
    try {
        const adminExists = await User.findOne({role: 'admin'});
        if (adminExists) {
            return res.status(200).json({message: 'Admin already exists.'});
        }

        const admin = new User({
            username: 'admin', password: 'password123', // Default password
            role: 'admin'
        });

        await admin.save();
        res.status(201).json({message: 'Default admin created (admin / password123)'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

exports.registerClient = async (req, res) => {
    try {
        const {username, password} = req.body;

        if (!username || !password) {
            return res.status(400).json({message: 'Please provide username and password'});
        }

        const existingUser = await User.findOne({username});
        if (existingUser) {
            return res.status(400).json({message: 'Username already exists'});
        }

        const client = new User({username, password, role: 'client'});

        await client.save();
        res.status(201).json({message: 'Client registered successfully'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

exports.login = async (req, res) => {
    try {
        const {username, password} = req.body;

        if (!username || !password) {
            return res.status(400).json({message: 'Please provide username and password'});
        }

        const user = await User.findOne({username});
        if (! user) {
            return res.status(401).json({message: 'Invalid credentials'});
        }

        const isMatch = await user.comparePassword(password);
        if (! isMatch) {
            return res.status(401).json({message: 'Invalid credentials'});
        }

        // Generate JWT
        // Uses process.env.JWT_SECRET if available, otherwise fallback
        const secret = process.env.JWT_SECRET || 'secret_key_change_me_in_prod';
        const token = jwt.sign({
            id: user._id,
            role: user.role,
            username: user.username
        }, secret, {expiresIn: '1d'});

        res.status(200).json({
            message: 'Logged in successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};
