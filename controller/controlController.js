let currentInstruction = {
    device: "",
    state: ""
};

export const recibirInstrucciones = async (req, res) => {
    const { device, state } = req.body;

    if (!device || !state) {
        return res.status(400).json({ error: "Faltan campos" });
    }

    currentInstruction = { device, state };
    console.log("Nueva instrucción recibida:", currentInstruction);
    res.json({ success: true });
};

export const enviarInstrucciones = async (req, res) => {
    res.json(currentInstruction);
    currentInstruction = { device: "", state: "" };
};

