import express from "express"
import { create, deleteUser, list, listID, login,logout, updateUser, getUser} from "../controller/userController.js"
import { listTemperatura, listHumedad, listGas, listLuz } from "../controller/dataController.js"
import authMiddleware from "../middleware/authmiddleware.js"
const routes = express.Router();

routes.post ("/addUser",create)
routes.get("/listUsers", list)
routes.get("/listUser/:id", listID)
routes.put("/updateUser/:id", updateUser)
routes.delete("/deleteUser/:id",deleteUser)
routes.get("/listTemperatura", listTemperatura)
routes.get("/listHumedad", listHumedad)
routes.get("/listGas", listGas)
routes.get("/listLuz", listLuz)
routes.post("/login", login)
routes.get("/getUser", authMiddleware, getUser)
routes.post("/logout", logout)
routes.get("/protected")

export default routes;