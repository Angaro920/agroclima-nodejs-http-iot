const User = require('../model/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { registrarAuditoria } = require('../utils/auditLogger');

/* import User from '../model/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { registrarAuditoria } from '../utils/auditLogger.js';
 */
// 🟢 LOGIN
const login = async (req, res) => {
  const { documento, password } = req.body;
  try {
    const user = await User.findOne({ documento });
    if (!user) return res.status(400).json({ msg: 'Credenciales inválidas' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Credenciales inválidas' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, 'secret', { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'None', path: '/' });

      registrarAuditoria(user.name, "Inicio de sesión").catch(err =>
        console.error("Error auditando inicio de sesión:", err)
      );

      res.json({ msg: 'Inicio de sesión exitoso' });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
};

// 🟢 GET USER AUTENTICADO
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.status(200).json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ errorMessage: "Error en el servidor" });
  }
};

// 🟢 LOGOUT
const logout = async (req, res) => {
  try {
    
    res.clearCookie("token", { 
      httpOnly: true, 
      secure: true, 
      sameSite: "None", 
      path: "/" 
    });
    res.status(200).json({ msg: "Sesión cerrada exitosamente" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
};

// 🟢 CREAR USUARIO
const create = async (req, res) => {
  try {
    const { documento, password } = req.body;
    const userExist = await User.findOne({ documento });
    if (userExist) return res.status(400).json({ message: "Usuario ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ ...req.body, password: hashedPassword });
    const savedData = await newUser.save();

    await registrarAuditoria(req.user?.name || 'Sistema', "Creación de usuario", {
      nuevoUsuario: newUser.name,
      tag: newUser.tag
    });

    res.status(200).json(savedData);
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// 🟢 LISTAR TODOS
const list = async (req, res) => {
  try {
    const userData = await User.find();
    if (!userData || userData.length === 0)
      return res.status(404).json({ message: "No hay datos encontrados" });
    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// 🟢 LISTAR POR ID
const listID = async (req, res) => {
  try {
    const id = req.params.id;
    const userExist = await User.findById(id);
    if (!userExist) return res.status(404).json({ message: "No hay datos encontrados" });
    res.status(200).json(userExist);
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// 🟢 ACTUALIZAR USUARIO
const updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const userExist = await User.findById(id);
    if (!userExist) return res.status(404).json({ message: "No hay datos encontrados" });

    // ⚠️ Eliminar campos vacíos
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] === "") delete req.body[key];
    });

    // 🔒 Encriptar nueva contraseña si viene
    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    const updatedData = await User.findByIdAndUpdate(id, req.body, { new: true });

    const usuarioAutenticado = req.user?.name || 'Sistema';
    await registrarAuditoria(usuarioAutenticado, "Actualización de usuario", {
      usuarioActualizado: updatedData.name,
      cambios: req.body
    });

    res.status(200).json(updatedData);
  } catch (error) {
    console.error("❌ Error en updateUser:", error.message);
    res.status(500).json({ errorMessage: error.message });
  }
};

// 🟢 ELIMINAR USUARIO
const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const userExist = await User.findById(id);
    if (!userExist) return res.status(404).json({ message: "No hay datos encontrados" });

    const usuarioAutenticado = req.user?.name || 'Sistema';

    await registrarAuditoria(usuarioAutenticado, "Eliminación de usuario", {
      usuarioEliminado: userExist.name,
      idEliminado: id
    });

    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar:", error.message);
    res.status(500).json({ errorMessage: error.message });
  }
};

module.exports = {
  login,
  getUser,
  logout,
  create,
  list,
  listID,
  updateUser,
  deleteUser
};
