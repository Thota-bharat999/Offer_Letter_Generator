const RelievingLetter=require('../models/RelievingLetter');

const mongoose=require('mongoose');

exports.createRelivingLetter=async(req,res)=>{
    try{
        const {employeeName,designation,employeeId,joiningDate,relievingDate}=req.body;

        if(!employeeName || !designation || !employeeId || !joiningDate || !relievingDate){
            return res.status(400).json({message:"All fields are required"});
        }
        const newRelivingLetter=new RelivingLetter({
            employeeName,
            designation,
            employeeId,
            joiningDate,
            relievingDate,

        });
        await newRelivingLetter.save();
        res.status(201).json({
            message: "Relieving letter created successfully",
      data: {
        _id: newLetter._id,
        employeeName: newRelivingLetter.employeeName
      }
        });

    }catch(error){
    console.error("❌ Error creating relieving letter:", error);
    res.status(500).json({ message: "Server error while creating relieving letter", error: error.message });

    }

}