import express from "express"
import { create, deleteUser, list, listID, login,logout, updateUser, getUser} from "../controller/userController.js"
import { reporteCSV, reporteXSLM, listData, dataDia, dataSemana, dataMes } from "../controller/dataController.js"
import authMiddleware from "../middleware/authmiddleware.js"
const routes = express.Router();

routes.get("/listMes/:collectionName", dataMes)
routes.get("/listSemana/:collectionName", dataSemana)
routes.get("/listDia/:collectionName", dataDia)
routes.get("/listData/:collectionName", listData)
routes.get("/reporteCSV/:collectionName", reporteCSV)
routes.get("/reporteExcel/:collectionName", reporteXSLM)
/* routes.get("/reportePDF/:collectionName", reportePDF) */
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