import User from '../model/userModel.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export const login = async (req, res) => {
    const { userName, password } = req.body;

    try {
        let user = await User.findOne({ userName });

        if (!user) {
            return res.status(400).json({ msg: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Credenciales inválidas' });
        }

        const payload = {
            user: {
                id: user.id
            }
        };
        jwt.sign(payload, 'secret', { expiresIn: 3600 }, (err, token) => {
            if (err) throw err;
            res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict', path: '/' });
            res.json({ msg: 'Inicio de sesión exitoso' });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error en el servidor');
    }
};
export const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ errorMessage: "Error en el servidor" });
    }
};
export const logout = async (req, res) => {
    try {
        console.log("Cookies antes de eliminar:", req.cookies); // Ver qué cookies hay
        res.setHeader("Set-Cookie", "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict");
        res.clearCookie("token", { 
            httpOnly: true, 
            secure: false, 
            sameSite: "strict", 
            path: "/" 
        });

        console.log("Cookies después de eliminar:", req.cookies); // Ver si cambian
        res.json({ msg: "Sesión cerrada" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error en el servidor");
    }
};

export const create = async (req, res) => {
    try {
        const newUser = new User(req.body);
        const { userName, password } = newUser;

        const userExist = await User.findOne({ userName })
        if (userExist) {
            return res.status(400).json({ message: "Usuario ya existe" });
        }
        const hashedPassword = await bcrypt.hashSync(newUser.password, 10);
        newUser.password = hashedPassword;
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
        res.status(200).json({ message: "Usuario eliminado correctamente" })
    } catch (error) {
        res.status(500).json({ errorMessage: error.message })
    }
}
