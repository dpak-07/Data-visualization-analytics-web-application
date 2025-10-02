// middleware/getUserId.js
// small middleware that ensures req.userId is set (from req.user.id or x-user-id header)
function attachUserId(req, res, next) {
  req.userId = req.user?.id || req.headers["x-user-id"] || "anonymous";
  next();
}

module.exports = attachUserId;
