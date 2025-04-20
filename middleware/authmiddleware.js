/* import jwt from "jsonwebtoken";
import User from "../model/userModel.js";*/
const jwt = require('jsonwebtoken');
const User = require('../model/userModel');

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token; // Obtiene el token desde las cookies

  if (!token) {
    return res.status(401).json({ msg: 'No hay token, autorización denegada' });
  }

  try {
    const decoded = jwt.verify(token, 'secret'); // Verifica el token
    const user = await User.findById(decoded.user.id).select('-password'); // Busca el usuario completo

    if (!user) {
      return res.status(401).json({ msg: 'Usuario no válido' });
    }

    req.user = user; // Asigna el usuario a la request
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token no válido' });
  }
};

module.exports = authMiddleware;
