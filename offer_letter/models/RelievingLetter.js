const mongoose=require("mongoose");
const relivingLetterSchema=new mongoose.Schema({
    employeeName:{type:String,required:true},
    designation:{type:String,required:true},
    employeeId :{type:String,required:true, unique: true},
    joiningDate:{type:Date,required:true},
    resignationDate:{type:Date,required:true},
    relievingDate:{type:Date,required:true},
    createdAt:{type:Date,default:Date.now()}
})
module.exports=mongoose.model("RelivingLetter",relivingLetterSchema)