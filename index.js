require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
const jwt =require('jsonwebtoken')
const stripe=require('stripe')(process.env.SECRET_PAYMENT_KEY)
const port = process.env.PORT || 5000 ;

const { MongoClient, ServerApiVersion } = require('mongodb');



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


app.get("/allUser/:roleUser",verifyToken,async(req,res)=>{
  const roleUser = req.params.roleUser
  const query ={role:roleUser}
const allUsers = await userCollection.find(query).toArray()
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


app.get("/hr/:email",verifyToken,async(req,res)=>{
  const email= req.params.email
  const query={email:email}
  const result = await userCollection.findOne(query)
  res.send(result)
})


app.post('/create-payment-intent',verifyToken,async(req,res)=>{
  const price=req.body.price
  const amount = parseInt(price * 100)
  const paymentIntent = await stripe.paymentIntents.create({
    amount:amount,
    currency:'usd',
payment_method_types:["card"]
  })
  res.send({clientSecret : paymentIntent.client_secret})
})

app.put("/memberUpdate/:email",verifyToken,verifyAdmin,async(req,res)=>{
 const email =req.params.email
 const queryEmail={email:email}
 const{member}=req.query
 if(!member){
  return res.send({message:"queryMember nai"})
 }
 if(member<0){
  return res.send({message:"queryMember nai is 0"})
 }
const update={
  $set:{addMember:parseInt(member)}
}
const result = await userCollection.updateOne(queryEmail,update)
res.send(result)
})

app.patch("/hrRoleUpdate/:email",verifyToken,async(req,res)=>{
const email =req.params.email
const query={email:email}
const update={
  $set:{role:"HrAdmin",pack:0}
}
const result = await userCollection.updateOne(query,update)
res.send(result)
})


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