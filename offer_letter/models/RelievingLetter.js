const mongoose=require("mongoose");
const relivingLetterSchema=new mongoose.Schema({
    employeeName:{type:String,required:true},
    desiganation:{type:String,required:true},
    employeeId :{type:String,required:true},
    joiningDate:{type:Date,required:true},
    relievingDate:{type:Date,required:true},
    createdAt:{type:Date,default:Date.now()}
})
module.exports=mongoose.model("RelivingLetter",relivingLetterSchema)