const User = require("../model/userModel");
const bcrypt = require("bcrypt");
const { sendPasswordEmail } = require("../utils/emailSender");
const { registrarAuditoria } = require("../utils/auditLogger");

const recoverPasswordByDocument = async (req, res) => {
  const { documento } = req.body;

  if (!documento) {
    return res.status(400).json({ message: "El documento (DNI) es requerido" });
  }

  try {
    // Buscar usuario por documento (nota: "users" es la colección, no "User")
    const user = await User.findOne({ documento });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No existe un usuario con ese número de documento" });
    }

    // Generar contraseña temporal
    const temporaryPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8);
    const hashedTemporaryPassword = await bcrypt.hash(temporaryPassword, 10);

    // Actualizar contraseña
    const updateResult = await User.findByIdAndUpdate(
      user._id,
      { password: hashedTemporaryPassword },
      { new: true }
    );

    console.log("Resultado de actualización:", updateResult ? "Éxito" : "Fallo");

    // Enviar correo
    await sendPasswordEmail(user.email, temporaryPassword, user.name);

    // Registrar auditoría
    await registrarAuditoria("Sistema", "Recuperación de contraseña", {
      usuario: user.userName,
      documento: user.documento,
    });

    return res.status(200).json({
      message:
        "Se ha enviado la contraseña temporal al correo electrónico registrado",
      email: user.email.replace(
        /(.{2})(.*)(?=@)/,
        (_, a, b) => a + b.replace(/./g, "*")
      ),
    });
  } catch (error) {
    console.error("Error al recuperar contraseña:", error.message);
    return res
      .status(500)
      .json({ message: "Error en el servidor", error: error.message });
  }
};

module.exports = {
  recoverPasswordByDocument,
};
