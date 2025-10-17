require("dotenv").config()
const express=require("express");
const mongoose=require("mongoose")
const app=express();
const bodyParser=require("body-parser");
const cors=require("cors");
app.use(express.json()); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));
const offerRoutes=require('./routes/offerRoutes');
const companyRoutes=require('./routes/companyRoutes')
app.use(cors())
app.use('/assets', express.static(__dirname + '/offer_letter/assets'));

app.use('/api/offer', offerRoutes)
app.use('/api/offer/company',companyRoutes)
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
}).then(()=> console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));
  const PORT=process.env.PORT || 3000;
  app.listen(PORT,()=>console.log(`Server Running on ${PORT}`))