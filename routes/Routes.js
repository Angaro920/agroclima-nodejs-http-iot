import express from "express"
import { create, deleteUser, list, listID, login,logout, updateUser, getUser} from "../controller/userController.js"
import { listTemperatura, listHumedad, listGas, listLuz, obtenerultimosDatos, reporteCSV, reporteXSLM, reportePDF } from "../controller/dataController.js"
import authMiddleware from "../middleware/authmiddleware.js"
const routes = express.Router();

routes.get("/reporteCSV/:collectionName", reporteCSV)
routes.get("/reporteExcel/:collectionName", reporteXSLM)
routes.get("/reportePDF/:collectionName", reportePDF)
routes.get("/protected")
routes.get("/temperatura12", obtenerultimosDatos)
routes.get("/listUsers", list)
routes.get("/listUser/:id", listID)
routes.get("/listTemperatura", listTemperatura)
routes.get("/listHumedad", listHumedad)
routes.get("/listGas", listGas)
routes.get("/listLuz", listLuz)
routes.get("/getUser", authMiddleware, getUser)
routes.post("/login", login)
routes.post ("/addUser",create)
routes.post("/logout", logout)
routes.put("/updateUser/:id", updateUser)
routes.delete("/deleteUser/:id",deleteUser)

export default routes;