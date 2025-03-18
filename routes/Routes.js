import express from "express"
import { create, deleteUser, list, listID, login,logout, updateUser, getUser} from "../controller/userController.js"
import { reporteCSV, reporteXSLM,reportePDF, listData, dataDia, dataSemana, dataMes } from "../controller/dataController.js"
import authMiddleware from "../middleware/authmiddleware.js"
const routes = express.Router();

routes.get("/listMonth/:collectionName", dataMes) //Trae los datos del mes
routes.get("/listWeek/:collectionName", dataSemana) //Trae los datos de la semana
routes.get("/listDay/:collectionName", dataDia) //Trae los datos del dia
routes.get("/listData/:collectionName", listData) //Trae todos los datos
routes.get("/csv/:collectionName", reporteCSV)
routes.get("/xlsx/:collectionName", reporteXSLM)
routes.get("/pdf/:collectionName", reportePDF)
routes.get("/protected")
routes.get("/listUsers", list)
routes.get("/listUser/:id", listID)
routes.get("/getUser", authMiddleware, getUser)
routes.post("/login", login)
routes.post ("/addUser",create)
routes.post("/logout", logout)
routes.put("/updateUser/:id", updateUser)
routes.delete("/deleteUser/:id",deleteUser)


export default routes;