import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    userName:{
        type:String,
        require: true,
    },
    password:{
        type:String,
        require: true
    },
    name:{
        type:String,
        require: true,
    },
    lastName:{
        type:String,
        require: true,
    },
    grade:{
        type:String,
        require: true,
    },
    age :{
        type:String,
        require: true,
    },
    tag :{
        type: String,
        require: true
    }

})

export default mongoose.model("Users", userSchema)