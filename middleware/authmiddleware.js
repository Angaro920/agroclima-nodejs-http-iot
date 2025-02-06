import jwt from "jsonwebtoken"

const authMiddleware = (req, res, next) => {
    const token = req.cookies.token; // Obtén el token de las cookies

    if (!token) {
        return res.status(401).json({ msg: 'No hay token, autorización denegada' });
    }

    try {
        const decoded = jwt.verify(token, 'secret'); // Verifica el token
        req.user = decoded.user; // Almacena el usuario en la solicitud
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token no válido' });
    }
};

export default authMiddleware