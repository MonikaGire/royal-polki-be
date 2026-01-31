const Users = require('../models/User');

exports.getUser = async (req, res) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ success: false, message: 'You Must Be Logged In.' });
  }

  try {
    const user = await Users.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User Not Found.' });
    }

    return user;
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error.' });
  }
};

exports.getAdmin = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: 'You Must Be Logged In.' });
    }

    const user = await Users.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User Not Found.' });
    }
    if (!user.role.includes('admin')) {
      return { error: 'Access Denied.', status: 401 };
    }

    return user;
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error.' });
  }
};
