const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    let token = req.headers.authorization;

    if (! token) {
        return res.status(403).json({message: 'No token provided'});
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    const secret = process.env.JWT_SECRET || 'secret_key_change_me_in_prod';

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(401).json({message: 'Unauthorized! Invalid Token'});
        }
        req.user = decoded;
        next();
    });
};

exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({message: 'Require Admin Role'});
    }
};
