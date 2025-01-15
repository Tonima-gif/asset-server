require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
const jwt =require('jsonwebtoken')
// const cookieParser=require('cookie-parser')
const port = process.env.PORT || 5000 ;

const { MongoClient, ServerApiVersion } = require('mongodb');


// const corsOptions ={
//     origin:['http://localhost:5173'],
//     credentials:true,
//     optionalSuccessStatus:200
//   }
  

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v4o8q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
   
const userCollection = client.db("application").collection("users")
// const HrAdminCollection = client.db("application").collection("Hr-Admin")


// generate token  jwt

app.post('/jwt',(req,res)=>{
    const email=req.body
   const token= jwt.sign(email,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'365d'})
   res.send({token})
  })

const verifyToken=(req,res,next)=>{
  if(!req.headers.authorization){
    return res.status(401).send({message:"unAuthorize access token"})
  }
  const token = req.headers.authorization.split(' ')[1];
jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
  if(err){
    return res.status(403).send({message:"forbidden access token"})
  }
  req.decoded=decoded
  next()
})
}

const verifyAdmin=async(req,res,next)=>{
const email =req.decoded.email
const query ={email:email}
const user =await userCollection.findOne(query)
const isAdmin=user?.role=="HrAdmin"
if(!isAdmin){
  return res.status(403).send({message:"forbidden access Admin"})
}
next()
}


app.get("/allUser",verifyToken,async(req,res)=>{
const allUsers = await userCollection.find().toArray()
res.send(allUsers)
})

app.get("/admin/:email",async(req,res)=>{
  const email = req.params.email
  const query = {email:email}
  const user = await userCollection.findOne(query)
let admin=false
if(user){
  admin = user?.role=="HrAdmin"
}
res.send({admin})
})

app.post('/users',async(req,res)=>{
const user = req.body;
const query ={email :user.email}
const exist=await userCollection.findOne(query)
if(exist){
  return res.send({message:"user already exist in db",insertedId:null})
}
const result = await userCollection.insertOne(user);
res.send(result)
})


app.get("/hr/:email",async(req,res)=>{
  const email= req.params.email
  const query={email:email}
  const result = await userCollection.findOne(query)
  res.send(result)
})


// app.post("/hrAdmin",async(req,res)=>{
//   const hr=req.body;
//   const query ={email :hr.email}
// const exist=await HrAdminCollection.findOne(query)
// if(exist){
//   return res.send({message:"user already exist in db",insertedId:null})
// }
// const result = await HrAdminCollection.insertOne(hr);
// res.send(result)
// })




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/' , (req , res)=>{
    res.send('server is running')
})

app.listen(port,()=>{
    console.log(`server is running on port : ${port}`)
})