import express from "express"
import { create, deleteUser, list, listID, login, logout, updateUser, getUser } from "../controller/userController.js"
import { listarAuditorias } from "../controller/auditoriaController.js";
import { reporteCSV, reporteXSLM, reportePDF, listData, dataDia, dataSemana, dataMes, obtenerDatosAmbientWeather, envioDatosSensores, recibirDatosSensores, dataDiaDual } from "../controller/dataController.js"

import authMiddleware from "../middleware/authmiddleware.js"
const routes = express.Router();

routes.get("/listMonth/:collectionName", dataMes) //Trae los datos del mes
routes.get("/listWeek/:collectionName", dataSemana) //Trae los datos de la semana
routes.get("/listDay/:collectionName", dataDia) //Trae los datos del dia
routes.get("/listData/:collectionName", listData) //Trae todos los datos
routes.get("/listDualDay/:collectionNameA/:collectionNameB", dataDiaDual)
routes.get("/csv/:collectionName", reporteCSV)
routes.get("/xlsx/:collectionName", reporteXSLM)
routes.get("/pdf/:collectionName", reportePDF)
routes.get("/protected")
routes.get("/listUsers", list)
routes.get("/listUser/:id", listID)
routes.get("/getUser", authMiddleware, getUser)
routes.get("/getLastData", envioDatosSensores)
routes.post("/login", login)
// routes.post("/addUser", create)
routes.post("/logout", logout)
routes.post("/sensores", recibirDatosSensores);
routes.post("/ambientweather", obtenerDatosAmbientWeather);
// routes.put("/updateUser/:id", updateUser)
// routes.delete("/deleteUser/:id", deleteUser)

routes.get("/auditorias", authMiddleware, listarAuditorias);





routes.post("/addUser", authMiddleware, create);
routes.put("/updateUser/:id", authMiddleware, updateUser);
routes.delete("/deleteUser/:id", authMiddleware, deleteUser);


export default routes;