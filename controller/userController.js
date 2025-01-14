import User from '../model/userModel.js'


export const create = async (req, res) => {
    try {
        const newUser = new User(req.body);
        const { userName } = newUser;

        const userExist = await User.findOne({ userName })
        if (userExist) {
            return res.status(400).json({ message: "Usuario ya existe" });
        }
        const savedData = await newUser.save();
        res.status(200).json(savedData)
    } catch (error) {
        res.status(500).json({ errorMessage: error.message })
    }
}

export const list = async (req, res) => {
    try {
        const userData = await User.find();
        if (!userData || userData.length === 0) {
            return res.status(404).json({ message: "No hay datos encontrados" })
        }
        res.status(200).json(userData)
    } catch (error) {
        res.status(500).json({ errorMessage: error.message })
    }
}
export const listID = async (req, res) => {
    try {
        const id = req.params.id;
        const userExist = await User.findById(id);

        if (!userExist) {
            return res.status(404).json({ message: "No hay datos encontrados" })
        }
        res.status(200).json(userExist)
    } catch (error) {
        res.status(500).json({ errorMessage: error.message })
    }
}

export const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const userExist = await User.findById(id);

        if (!userExist) {
            return res.status(404).json({ message: "No hay datos encontrados" })
        }
        const updatedData = await User.findByIdAndUpdate(id, req.body, { new: true })
        res.status(200).json(updatedData)
    } catch (error) {
        res.status(500).json({ errorMessage: error.message })
    }
}

export const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;
        const userExist = await User.findById(id);

        if (!userExist) {
            return res.status(404).json({ message: "No hay datos encontrados" })
        }
        await User.findByIdAndDelete(id)
        res.status(200).json({message: "Usuario eliminado correctamente"})
    } catch (error) {
        res.status(500).json({ errorMessage: error.message })
    }
}