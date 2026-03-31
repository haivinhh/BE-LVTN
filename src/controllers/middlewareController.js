// Backward compatibility shim — routes vẫn import file này
const { middlewareController } = require('../middleware/authMiddleware');
module.exports = middlewareController;
