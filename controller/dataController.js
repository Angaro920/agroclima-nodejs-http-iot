import { Temperatura, Humedad, Gas,  Luz } from "../model/dataModel.js";

// Controlador para listar todos los registros
export const listTemperatura = async (req, res) => {
    try {
        const temperaturas = await Temperatura.find();
        if (temperaturas.length === 0) {
            return res.status(404).json({ message: "No se encontraron datos de temperatura." });
        }
        res.status(200).json(temperaturas);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los datos", error: error.message });
    }
};


export const listHumedad = async (req, res) => {
    try {
        const Humedads = await Humedad.find();
        if (Humedads.length === 0) {
            return res.status(404).json({ message: "No se encontraron datos de Humedad." });
        }
        res.status(200).json(Humedads);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los datos", error: error.message });
    }
};

export const listGas = async (req, res) => {
    try {
        const Gases = await Gas.find();
        if (Gases.length === 0) {
            return res.status(404).json({ message: "No se encontraron datos de Gases." });
        }
        res.status(200).json(Gases);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los datos", error: error.message });
    }
};

export const listLuz = async (req, res) => {
    try {
        const luces = await Luz.find();
        if (luces.length === 0) {
            return res.status(404).json({ message: "No se encontraron datos de Luz." });
        }
        res.status(200).json(luces);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener los datos", error: error.message });
    }
};