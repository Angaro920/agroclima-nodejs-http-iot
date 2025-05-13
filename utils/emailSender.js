const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const sendPasswordEmail = async (email, password, name) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const logoColegio = path.join(__dirname, "../img/colegio.png");
    const logoCiiap = path.join(__dirname, "../img/CIIAP.png");
    const logoUniversidad = path.join(__dirname, "../img/udec.png");

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Recuperación de Contraseña",
      html: `
            <div style="text-align: center; font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h1 style="color: #333; text-align: center;">Recuperación de Contraseña</h1>
      <p>Hola ${name},</p>
      <p>Has solicitado recuperar tu contraseña en nuestro sistema.</p>
      <p>Tu contraseña es: <strong>${password}</strong></p>
      <p style="color: #666; font-size: 12px;">Por razones de seguridad, te recomendamos cambiar esta contraseña una vez inicies sesión.</p>
      
      <div style="text-align: center;">
        <img src="cid:logoColegio" width="70" height="70">
        <img src="cid:logoCiiap" width="70" height="90">
        <img src="cid:logoUniversidad" width="70" height="90">
      </div>
    </div>
      `,
      attachments: [
        {
          filename: "colegio.png",
          path: logoColegio,
          cid: "logoColegio",
        },
        {
          filename: "CIIAP.png",
          path: logoCiiap,
          cid: "logoCiiap",
        },
        {
          filename: "udec.png",
          path: logoUniversidad,
          cid: "logoUniversidad",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Correo enviado: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    throw error;
  }
};

module.exports = { sendPasswordEmail };
