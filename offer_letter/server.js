require("dotenv").config()
const express=require("express");
const cors=require("cors");
const mongoose=require("mongoose")
const app=express();
const bodyParser=require("body-parser");

app.use(express.json()); 
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));
const offerRoutes=require('./routes/offerRoutes');
const companyRoutes=require('./routes/companyRoutes')


app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001", // your local dev
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use('/assets', express.static(__dirname + '/offer_letter/assets'));

app.use('/api/offer', offerRoutes)
app.use('/api/offer/company',companyRoutes)
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
}).then(()=> console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => res.send("Offer Letter Generator API is running..."));
  const PORT=process.env.PORT || 5000;
  app.listen(PORT,()=>console.log(`Server Running on ${PORT}`))