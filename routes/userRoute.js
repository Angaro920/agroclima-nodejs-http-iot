import express from "express"
import { create, deleteUser, list, listID, updateUser } from "../controller/userController.js"

const routes = express.Router();

routes.post ("/addUser",create)
routes.get("/listUsers", list)
routes.get("/listUser/:id", listID)
routes.put("/updateUser/:id", updateUser)
routes.delete("/deleteUser/:id",deleteUser)
export default routes;