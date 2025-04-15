import User from '../model/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { registrarAuditoria } from '../utils/auditLogger.js';

// 🟢 LOGIN
export const login = async (req, res) => {
  const { userName, password } = req.body;
  try {
    const user = await User.findOne({ userName });
    if (!user) return res.status(400).json({ msg: 'Credenciales inválidas' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Credenciales inválidas' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, 'secret', { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'None', path: '/' });

      registrarAuditoria(user.userName, "Inicio de sesión").catch(err =>
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
export const getUser = async (req, res) => {
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
export const logout = async (req, res) => {
  try {
    res.setHeader("Set-Cookie", "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict");
    res.clearCookie("token", { httpOnly: true, secure: false, sameSite: "strict", path: "/" });
    res.json({ msg: "Sesión cerrada" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
};

// 🟢 CREAR USUARIO
export const create = async (req, res) => {
  try {
    const { userName, password } = req.body;
    const userExist = await User.findOne({ userName });
    if (userExist) return res.status(400).json({ message: "Usuario ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ ...req.body, password: hashedPassword });
    const savedData = await newUser.save();

    await registrarAuditoria(req.user?.userName || 'Sistema', "Creación de usuario", {
      nuevoUsuario: newUser.userName,
      tag: newUser.tag
    });

    res.status(200).json(savedData);
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// 🟢 LISTAR TODOS
export const list = async (req, res) => {
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
export const listID = async (req, res) => {
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
export const updateUser = async (req, res) => {
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

    await registrarAuditoria(req.user.userName, "Actualización de usuario", {
      usuarioActualizado: updatedData.userName,
      cambios: req.body
    });

    res.status(200).json(updatedData);
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};

// 🟢 ELIMINAR USUARIO
export const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const userExist = await User.findById(id);
    if (!userExist) return res.status(404).json({ message: "No hay datos encontrados" });

    await registrarAuditoria(req.user.userName, "Eliminación de usuario", {
      usuarioEliminado: userExist.userName,
      idEliminado: id
    });

    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ errorMessage: error.message });
  }
};
