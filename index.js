require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
// const jwt =require('jsonwebtoken')
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


// // generate token  jwt

// app.post('/jwt',(req,res)=>{
//     const email=req.body
//    const token= jwt.sign(email,process.env.PRIVATE_KEY,{expiresIn:'365d'})
//     res.cookie('token',token ,{
//       httpOnly:true,
//       secure:process.env.NODE_ENV ==='production',
//       sameSite:process.env.NODE_ENV==='production'?'none':'strict',
//     }).send({success:true})
//   })
  
//   // remove token jwt
//   app.get('/remove',(req,res)=>{
//     res.clearCookie("token",{
//       maxAge:0,
//       secure:process.env.NODE_ENV ==='production',
//       sameSite:process.env.NODE_ENV==='production'?'none':'strict',
//     }).send({success:true})
//   })
  




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