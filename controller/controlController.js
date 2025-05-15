const { registrarAuditoria } = require("../utils/auditLogger");

let currentInstruction = {
    device: "",
    state: ""
};

const recibirInstrucciones = async (req, res) => {
    // Asegúrate de que userName llegue correctamente
    console.log("👤 Usuario recibido en controlador:", req.user);

    const { device, state } = req.body;

    if (!device || !state) {
        return res.status(400).json({ error: "Faltan campos" });
    }

    currentInstruction = { device, state };
    console.log("🆕 Nueva instrucción recibida:", currentInstruction);

    // ✅ Auditoría con nombre del usuario autenticado
    await registrarAuditoria(
        req.user?.name || "Desconocido",
        "Recibir Instrucción",
        { device, state }
    );

    res.json({ success: true });
};
const enviarInstrucciones = async (req, res) => {
    res.json(currentInstruction);
    currentInstruction = { device: "", state: "" };
};

module.exports = {
    recibirInstrucciones,
    enviarInstrucciones
};
